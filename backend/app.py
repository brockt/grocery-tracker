from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from models import db, User, Purchase, Store, Item, Packaging, Measurement
from datetime import datetime, timedelta
import os
from sqlalchemy import func, extract
import time
from urllib.parse import quote_plus

app = Flask(__name__)
CORS(app)

# Build database URL from separate components
db_user = os.getenv('DB_USER', 'tracker_user')
db_password = os.getenv('DB_PASSWORD', 'ChangeMe123!')
db_name = os.getenv('DB_NAME', 'tracker')
db_host = os.getenv('DB_HOST', 'db')
db_port = os.getenv('DB_PORT', '5432')

database_url = f'postgresql://{db_user}:{quote_plus(db_password)}@{db_host}:{db_port}/{db_name}?connect_timeout=10'

app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.getenv('SECRET_KEY', 'super-secret-key')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)

db.init_app(app)
jwt = JWTManager(app)

def seed_default_options():
    """Seed default options if tables are empty"""
    default_stores = ['Walmart', 'Costco', 'Loblaws', 'Sobeys', 'Metro', 'No Frills', 'Food Basics', 'Real Canadian Superstore']
    default_items = ['Milk', 'Bread', 'Eggs', 'Butter', 'Cheese', 'Chicken Breast', 'Ground Beef', 'Rice', 'Pasta', 'Tomatoes', 'Apples', 'Bananas']
    default_packaging = ['Bottle', 'Can', 'Jar', 'Bag', 'Box', 'Carton', 'Tub', 'Pouch', 'Pack', 'Wrapper']
    default_measurements = ['ml', 'L', 'g', 'kg', 'oz', 'lb', 'fl oz', 'gal']
    
    if Store.query.count() == 0:
        for name in default_stores:
            db.session.add(Store(name=name))
    
    if Item.query.count() == 0:
        for name in default_items:
            db.session.add(Item(name=name))
    
    if Packaging.query.count() == 0:
        for name in default_packaging:
            db.session.add(Packaging(name=name))
    
    if Measurement.query.count() == 0:
        for unit in default_measurements:
            db.session.add(Measurement(unit=unit))
    
    db.session.commit()

def init_admin():
    admin_email = os.getenv('ADMIN_EMAIL', 'admin@tracker.local')
    admin_password = os.getenv('ADMIN_PASSWORD', 'Admin123!')
    
    if not User.query.filter_by(email=admin_email).first():
        admin = User(
            email=admin_email,
            name='Admin',
            is_admin=True
        )
        admin.set_password(admin_password)
        db.session.add(admin)
        db.session.commit()
        print("Admin user created successfully")

def wait_for_db():
    max_retries = 30
    retry_count = 0
    
    while retry_count < max_retries:
        try:
            with app.app_context():
                db.create_all()
                seed_default_options()
                init_admin()
                print("Database initialized successfully")
                return True
        except Exception as e:
            retry_count += 1
            print(f"Waiting for database... ({retry_count}/{max_retries}): {e}")
            time.sleep(2)
    
    return False

# Auth routes
@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(email=data.get('email')).first()
    
    if user and user.check_password(data.get('password')):
        access_token = create_access_token(identity=str(user.id), additional_claims={'is_admin': user.is_admin})
        return jsonify({
            'token': access_token,
            'user': {
                'id': user.id,
                'email': user.email,
                'name': user.name,
                'is_admin': user.is_admin
            }
        }), 200
    
    return jsonify({'message': 'Invalid credentials'}), 401

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    
    if User.query.filter_by(email=data.get('email')).first():
        return jsonify({'message': 'User already exists'}), 400
    
    user = User(
        email=data['email'],
        name=data['name'],
        is_admin=False
    )
    user.set_password(data['password'])
    
    db.session.add(user)
    db.session.commit()
    
    return jsonify({'message': 'User created successfully'}), 201

# Admin management routes
@app.route('/api/admin/stores', methods=['GET', 'POST'])
@jwt_required()
def manage_stores():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or not user.is_admin:
        return jsonify({'message': 'Admin access required'}), 403
    
    if request.method == 'GET':
        stores = Store.query.order_by(Store.name).all()
        return jsonify([s.to_dict() for s in stores]), 200
    
    elif request.method == 'POST':
        data = request.get_json()
        if Store.query.filter_by(name=data['name']).first():
            return jsonify({'message': 'Store already exists'}), 400
        
        store = Store(name=data['name'])
        db.session.add(store)
        db.session.commit()
        return jsonify(store.to_dict()), 201

@app.route('/api/admin/stores/<int:id>', methods=['PUT', 'DELETE'])
@jwt_required()
def manage_store(id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or not user.is_admin:
        return jsonify({'message': 'Admin access required'}), 403
    
    store = Store.query.get_or_404(id)
    
    if request.method == 'PUT':
        data = request.get_json()
        if Store.query.filter(Store.name == data['name'], Store.id != id).first():
            return jsonify({'message': 'Store name already exists'}), 400
        store.name = data['name']
        db.session.commit()
        return jsonify(store.to_dict()), 200
    
    elif request.method == 'DELETE':
        if Purchase.query.filter_by(store_id=id).first():
            return jsonify({'message': 'Cannot delete store that has purchases'}), 400
        db.session.delete(store)
        db.session.commit()
        return jsonify({'message': 'Store deleted'}), 200

@app.route('/api/admin/items', methods=['GET', 'POST'])
@jwt_required()
def manage_items():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or not user.is_admin:
        return jsonify({'message': 'Admin access required'}), 403
    
    if request.method == 'GET':
        items = Item.query.order_by(Item.name).all()
        return jsonify([i.to_dict() for i in items]), 200
    
    elif request.method == 'POST':
        data = request.get_json()
        if Item.query.filter_by(name=data['name']).first():
            return jsonify({'message': 'Item already exists'}), 400
        
        item = Item(name=data['name'], category=data.get('category', ''))
        db.session.add(item)
        db.session.commit()
        return jsonify(item.to_dict()), 201

@app.route('/api/admin/items/<int:id>', methods=['PUT', 'DELETE'])
@jwt_required()
def manage_item(id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or not user.is_admin:
        return jsonify({'message': 'Admin access required'}), 403
    
    item = Item.query.get_or_404(id)
    
    if request.method == 'PUT':
        data = request.get_json()
        if Item.query.filter(Item.name == data['name'], Item.id != id).first():
            return jsonify({'message': 'Item name already exists'}), 400
        item.name = data['name']
        item.category = data.get('category', item.category)
        db.session.commit()
        return jsonify(item.to_dict()), 200
    
    elif request.method == 'DELETE':
        if Purchase.query.filter_by(item_id=id).first():
            return jsonify({'message': 'Cannot delete item that has purchases'}), 400
        db.session.delete(item)
        db.session.commit()
        return jsonify({'message': 'Item deleted'}), 200

@app.route('/api/admin/packaging', methods=['GET', 'POST'])
@jwt_required()
def manage_packaging_list():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or not user.is_admin:
        return jsonify({'message': 'Admin access required'}), 403
    
    if request.method == 'GET':
        packaging = Packaging.query.order_by(Packaging.name).all()
        return jsonify([p.to_dict() for p in packaging]), 200
    
    elif request.method == 'POST':
        data = request.get_json()
        if Packaging.query.filter_by(name=data['name']).first():
            return jsonify({'message': 'Packaging type already exists'}), 400
        
        pack = Packaging(name=data['name'])
        db.session.add(pack)
        db.session.commit()
        return jsonify(pack.to_dict()), 201

@app.route('/api/admin/packaging/<int:id>', methods=['PUT', 'DELETE'])
@jwt_required()
def manage_packaging(id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or not user.is_admin:
        return jsonify({'message': 'Admin access required'}), 403
    
    pack = Packaging.query.get_or_404(id)
    
    if request.method == 'PUT':
        data = request.get_json()
        if Packaging.query.filter(Packaging.name == data['name'], Packaging.id != id).first():
            return jsonify({'message': 'Packaging type already exists'}), 400
        pack.name = data['name']
        db.session.commit()
        return jsonify(pack.to_dict()), 200
    
    elif request.method == 'DELETE':
        if Purchase.query.filter_by(packaging_id=id).first():
            return jsonify({'message': 'Cannot delete packaging that has purchases'}), 400
        db.session.delete(pack)
        db.session.commit()
        return jsonify({'message': 'Packaging deleted'}), 200

@app.route('/api/admin/measurements', methods=['GET', 'POST'])
@jwt_required()
def manage_measurements_list():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or not user.is_admin:
        return jsonify({'message': 'Admin access required'}), 403
    
    if request.method == 'GET':
        measurements = Measurement.query.order_by(Measurement.unit).all()
        return jsonify([m.to_dict() for m in measurements]), 200
    
    elif request.method == 'POST':
        data = request.get_json()
        if Measurement.query.filter_by(unit=data['unit']).first():
            return jsonify({'message': 'Measurement unit already exists'}), 400
        
        meas = Measurement(unit=data['unit'])
        db.session.add(meas)
        db.session.commit()
        return jsonify(meas.to_dict()), 201

@app.route('/api/admin/measurements/<int:id>', methods=['PUT', 'DELETE'])
@jwt_required()
def manage_measurement(id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or not user.is_admin:
        return jsonify({'message': 'Admin access required'}), 403
    
    meas = Measurement.query.get_or_404(id)
    
    if request.method == 'PUT':
        data = request.get_json()
        if Measurement.query.filter(Measurement.unit == data['unit'], Measurement.id != id).first():
            return jsonify({'message': 'Measurement unit already exists'}), 400
        meas.unit = data['unit']
        db.session.commit()
        return jsonify(meas.to_dict()), 200
    
    elif request.method == 'DELETE':
        if Purchase.query.filter_by(measurement_id=id).first():
            return jsonify({'message': 'Cannot delete measurement that has purchases'}), 400
        db.session.delete(meas)
        db.session.commit()
        return jsonify({'message': 'Measurement deleted'}), 200

# Purchase routes
@app.route('/api/purchases', methods=['GET'])
@jwt_required()
def get_purchases():
    user_id = int(get_jwt_identity())
    purchases = Purchase.query.filter_by(user_id=user_id).order_by(Purchase.purchase_date.desc()).all()
    
    return jsonify([p.to_dict() for p in purchases]), 200

@app.route('/api/purchases', methods=['POST'])
@jwt_required()
def create_purchase():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    
    if not Store.query.get(data['store_id']):
        return jsonify({'message': 'Invalid store'}), 400
    if not Item.query.get(data['item_id']):
        return jsonify({'message': 'Invalid item'}), 400
    if not Packaging.query.get(data['packaging_id']):
        return jsonify({'message': 'Invalid packaging'}), 400
    if not Measurement.query.get(data['measurement_id']):
        return jsonify({'message': 'Invalid measurement'}), 400
    
    pricing_type = data.get('pricing_type', 'unit')
    if pricing_type not in ['unit', 'weight']:
        return jsonify({'message': 'Invalid pricing type'}), 400
    
    purchase = Purchase(
        user_id=user_id,
        purchase_date=datetime.strptime(data['purchase_date'], '%Y-%m-%d'),
        store_id=data['store_id'],
        item_id=data['item_id'],
        packaging_id=data['packaging_id'],
        measurement_id=data['measurement_id'],
        pricing_type=pricing_type,
        size=float(data['size']),
        quantity=float(data['quantity']),
        price=float(data['price']),
        unit_price=float(data['unit_price']),
        on_sale=data.get('on_sale', False)
    )
    
    db.session.add(purchase)
    db.session.commit()
    
    return jsonify(purchase.to_dict()), 201

@app.route('/api/purchases/<int:id>', methods=['PUT'])
@jwt_required()
def update_purchase(id):
    user_id = int(get_jwt_identity())
    purchase = Purchase.query.filter_by(id=id, user_id=user_id).first_or_404()
    
    data = request.get_json()
    purchase.purchase_date = datetime.strptime(data['purchase_date'], '%Y-%m-%d')
    purchase.store_id = data['store_id']
    purchase.item_id = data['item_id']
    purchase.packaging_id = data['packaging_id']
    purchase.measurement_id = data['measurement_id']
    purchase.pricing_type = data.get('pricing_type', 'unit')
    purchase.size = float(data['size'])
    purchase.quantity = float(data['quantity'])
    purchase.price = float(data['price'])
    purchase.unit_price = float(data['unit_price'])
    purchase.on_sale = data.get('on_sale', False)
    
    db.session.commit()
    
    return jsonify(purchase.to_dict()), 200

@app.route('/api/purchases/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_purchase(id):
    user_id = int(get_jwt_identity())
    purchase = Purchase.query.filter_by(id=id, user_id=user_id).first_or_404()
    
    db.session.delete(purchase)
    db.session.commit()
    
    return jsonify({'message': 'Purchase deleted'}), 200

# Reports routes
@app.route('/api/reports/price-history')
@jwt_required()
def price_history():
    user_id = int(get_jwt_identity())
    item_id = request.args.get('item_id')
    
    query = Purchase.query.filter_by(user_id=user_id)
    if item_id:
        query = query.filter_by(item_id=item_id)
    
    purchases = query.order_by(Purchase.purchase_date).all()
    
    return jsonify([{
        'date': p.purchase_date.strftime('%Y-%m-%d'),
        'item': p.item.name if p.item else 'Unknown',
        'store': p.store.name if p.store else 'Unknown',
        'unit_price': p.unit_price,
        'price': p.price,
        'size': p.size,
        'quantity': p.quantity,
        'measurement': p.measurement.unit if p.measurement else '',
        'pricing_type': p.pricing_type,
        'packaging': p.packaging.name if p.packaging else '',
        'on_sale': p.on_sale
    } for p in purchases]), 200

@app.route('/api/reports/store-comparison')
@jwt_required()
def store_comparison():
    user_id = int(get_jwt_identity())
    
    results = db.session.query(
        Store.name,
        func.avg(Purchase.unit_price).label('avg_price'),
        func.count(Purchase.id).label('purchase_count')
    ).join(Purchase, Purchase.store_id == Store.id).filter(
        Purchase.user_id == user_id
    ).group_by(Store.name).all()
    
    return jsonify([{
        'store': r[0],
        'avg_price': round(float(r[1]), 2),
        'purchase_count': r[2]
    } for r in results]), 200

@app.route('/api/reports/monthly-spending')
@jwt_required()
def monthly_spending():
    user_id = int(get_jwt_identity())
    
    results = db.session.query(
        extract('year', Purchase.purchase_date).label('year'),
        extract('month', Purchase.purchase_date).label('month'),
        func.sum(Purchase.price).label('total')
    ).filter_by(user_id=user_id).group_by('year', 'month').order_by('year', 'month').all()
    
    return jsonify([{
        'year': int(r[0]),
        'month': int(r[1]),
        'total': round(float(r[2]), 2)
    } for r in results]), 200

@app.route('/api/reports/items')
@jwt_required()
def get_items_list():
    items = Item.query.order_by(Item.name).all()
    stores = Store.query.order_by(Store.name).all()
    
    return jsonify({
        'items': [i.to_dict() for i in items],
        'stores': [s.to_dict() for s in stores]
    }), 200

@app.route('/api/data/options')
@jwt_required()
def get_options():
    return jsonify({
        'packaging': [p.to_dict() for p in Packaging.query.order_by(Packaging.name).all()],
        'measurements': [m.to_dict() for m in Measurement.query.order_by(Measurement.unit).all()],
        'stores': [s.to_dict() for s in Store.query.order_by(Store.name).all()],
        'items': [i.to_dict() for i in Item.query.order_by(Item.name).all()]
    }), 200

@app.route('/api/admin/users', methods=['GET'])
@jwt_required()
def get_users():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or not user.is_admin:
        return jsonify({'message': 'Admin access required'}), 403
    
    users = User.query.all()
    return jsonify([u.to_dict() for u in users]), 200

@app.route('/api/admin/users/<int:id>', methods=['PUT', 'DELETE'])
@jwt_required()
def manage_user(id):
    user_id = int(get_jwt_identity())
    admin = User.query.get(user_id)
    if not admin or not admin.is_admin:
        return jsonify({'message': 'Admin access required'}), 403
    
    user = User.query.get_or_404(id)
    
    if request.method == 'PUT':
        data = request.get_json()
        if 'name' in data:
            user.name = data['name']
        if 'email' in data:
            user.email = data['email']
        if 'is_admin' in data:
            user.is_admin = data['is_admin']
        if 'password' in data:
            user.set_password(data['password'])
        db.session.commit()
        return jsonify(user.to_dict()), 200
    
    elif request.method == 'DELETE':
        db.session.delete(user)
        db.session.commit()
        return jsonify({'message': 'User deleted'}), 200

if __name__ == '__main__':
    print("Starting backend server...")
    if not wait_for_db():
        print("Failed to initialize database, exiting...")
        exit(1)
    print("Database ready, starting Flask...")
    app.run(host='0.0.0.0', port=5000, debug=False)
