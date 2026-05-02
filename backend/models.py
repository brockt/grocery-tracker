from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    is_admin = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    purchases = db.relationship('Purchase', backref='user', lazy=True)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'is_admin': self.is_admin,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Category(db.Model):
    __tablename__ = 'categories'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    items = db.relationship('Item', backref='category_ref', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name
        }

class Store(db.Model):
    __tablename__ = 'stores'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name
        }

class Item(db.Model):
    __tablename__ = 'items'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), unique=True, nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id'), nullable=True)
    category = db.Column(db.String(100))  # Kept for backward compatibility
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'category': self.category_ref.name if self.category_ref else (self.category or ''),
            'category_id': self.category_id
        }

class Packaging(db.Model):
    __tablename__ = 'packaging'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name
        }

class Measurement(db.Model):
    __tablename__ = 'measurements'
    
    id = db.Column(db.Integer, primary_key=True)
    unit = db.Column(db.String(20), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'unit': self.unit
        }

class Purchase(db.Model):
    __tablename__ = 'purchases'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    purchase_date = db.Column(db.Date, nullable=False)
    store_id = db.Column(db.Integer, db.ForeignKey('stores.id'), nullable=False)
    item_id = db.Column(db.Integer, db.ForeignKey('items.id'), nullable=False)
    packaging_id = db.Column(db.Integer, db.ForeignKey('packaging.id'), nullable=False)
    measurement_id = db.Column(db.Integer, db.ForeignKey('measurements.id'), nullable=False)
    pricing_type = db.Column(db.String(20), nullable=False, default='unit')
    size = db.Column(db.Float, nullable=False)
    quantity = db.Column(db.Float, nullable=False)
    price = db.Column(db.Float, nullable=False)
    unit_price = db.Column(db.Float, nullable=False)
    on_sale = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    store = db.relationship('Store', foreign_keys=[store_id])
    item = db.relationship('Item', foreign_keys=[item_id])
    packaging = db.relationship('Packaging', foreign_keys=[packaging_id])
    measurement = db.relationship('Measurement', foreign_keys=[measurement_id])
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'purchase_date': self.purchase_date.isoformat() if self.purchase_date else None,
            'store': self.store.name if self.store else None,
            'store_id': self.store_id,
            'item_name': self.item.name if self.item else None,
            'item_id': self.item_id,
            'packaging': self.packaging.name if self.packaging else None,
            'packaging_id': self.packaging_id,
            'measurement': self.measurement.unit if self.measurement else None,
            'measurement_id': self.measurement_id,
            'pricing_type': self.pricing_type,
            'size': self.size,
            'quantity': self.quantity,
            'price': self.price,
            'unit_price': self.unit_price,
            'on_sale': self.on_sale,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
