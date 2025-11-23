# backend/app.py
import os
import datetime
import json
import jwt
from functools import wraps
from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from config import Config

app = Flask(__name__)
app.config.from_object(Config)
db = SQLAlchemy(app)

# --- 游戏数值配置 (The Spreadsheet Config) ---
GAME_CONFIG = {
    # 建筑配置
    "buildings": {
        "lumberjack": {"cost": 100, "maintenance": 10, "output": {"wood": 4}, "input": {}},
        "fishery":    {"cost": 200, "maintenance": 15, "output": {"fish": 5}, "input": {}},
        "sheep_farm": {"cost": 300, "maintenance": 10, "output": {"wool": 4}, "input": {}},
        "weaver":     {"cost": 400, "maintenance": 20, "output": {"work_clothes": 2}, "input": {"wool": 2}},
        "house_t1":   {"cost": 0,   "maintenance": 0,  "tax_per_head": 1, "capacity": 10}, 
    },
    # 人口需求
    "needs": {
        "pioneers": {"fish": 1.0, "work_clothes": 0.5},
    }
}

# --- 数据库模型 ---
class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    silver_coins = db.Column(db.Integer, default=5000)

class Island(db.Model):
    __tablename__ = 'islands'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    map_data = db.Column(db.JSON) 
    status = db.relationship('IslandStatus', uselist=False, backref='island')
    buildings = db.relationship('Building', backref='island')

class IslandStatus(db.Model):
    __tablename__ = 'island_status'
    id = db.Column(db.Integer, primary_key=True)
    island_id = db.Column(db.Integer, db.ForeignKey('islands.id'))
    wood = db.Column(db.Integer, default=50)
    fish = db.Column(db.Integer, default=0)
    wool = db.Column(db.Integer, default=0)
    work_clothes = db.Column(db.Integer, default=0)
    pop_pioneers = db.Column(db.Integer, default=0)

    def to_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}

class Building(db.Model):
    __tablename__ = 'buildings'
    id = db.Column(db.Integer, primary_key=True)
    island_id = db.Column(db.Integer, db.ForeignKey('islands.id'))
    type = db.Column(db.String(50))
    grid_x = db.Column(db.Integer)
    grid_y = db.Column(db.Integer)

# --- 辅助函数 ---
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(" ")[1]
        if not token: 
            return jsonify({'message': 'Token missing'}), 401
        try:
            data = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=["HS256"])
            current_user = User.query.get(data['user_id'])
        except Exception as e:
            return jsonify({'message': 'Token invalid', 'error': str(e)}), 401
        return f(current_user, *args, **kwargs)
    return decorated

def init_island_for_user(user):
    default_map = [['grass' for _ in range(20)] for _ in range(20)]
    new_island = Island(user_id=user.id, map_data=default_map)
    db.session.add(new_island)
    db.session.flush() 
    new_status = IslandStatus(island_id=new_island.id)
    db.session.add(new_status)
    db.session.commit()
    return new_island

# --- API 路由 ---

# 1. Ping 路由 (这就是刚才缺失导致报错的部分)
@app.route('/api/ping', methods=['GET'])
def ping():
    return jsonify({'status': 'ok', 'message': 'pong'})

# 2. 根路由
@app.route('/')
def hello():
    return jsonify({"message": "Welcome to Anno 1800 Clone API"})

# 3. 注册
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'message': 'Missing data'}), 400
        
    hashed = generate_password_hash(data['password'], method='scrypt')
    new_user = User(username=data['username'], password_hash=hashed)
    db.session.add(new_user)
    try:
        db.session.commit()
        init_island_for_user(new_user)
        return jsonify({'message': 'Registered successfully'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Error registering', 'details': str(e)}), 500

# 4. 登录
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(username=data.get('username')).first()
    if not user or not check_password_hash(user.password_hash, data.get('password')):
        return jsonify({'message': 'Invalid credentials'}), 401
    
    token = jwt.encode({
        'user_id': user.id, 
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }, app.config['JWT_SECRET_KEY'], algorithm="HS256")
    
    return jsonify({
        'token': token, 
        'user': {'username': user.username, 'coins': user.silver_coins}
    })

# 5. 获取游戏状态
@app.route('/api/game/state', methods=['GET'])
@token_required
def get_game_state(current_user):
    island = Island.query.filter_by(user_id=current_user.id).first()
    if not island:
        island = init_island_for_user(current_user)
    
    buildings = Building.query.filter_by(island_id=island.id).all()
    b_list = [{'type': b.type, 'x': b.grid_x, 'y': b.grid_y} for b in buildings]
    
    return jsonify({
        'map': island.map_data,
        'status': island.status.to_dict(),
        'buildings': b_list,
        'coins': current_user.silver_coins
    })

# 6. 建造建筑
@app.route('/api/game/build', methods=['POST'])
@token_required
def build_structure(current_user):
    data = request.get_json()
    b_type = data.get('type')
    x, y = data.get('x'), data.get('y')
    
    island = Island.query.filter_by(user_id=current_user.id).first()
    cfg = GAME_CONFIG['buildings'].get(b_type)
    
    if not cfg: return jsonify({'message': 'Invalid building type'}), 400
    if current_user.silver_coins < cfg['cost']:
        return jsonify({'message': 'Not enough silver'}), 400
    
    if Building.query.filter_by(island_id=island.id, grid_x=x, grid_y=y).first():
        return jsonify({'message': 'Space already occupied'}), 400

    current_user.silver_coins -= cfg['cost']
    new_b = Building(island_id=island.id, type=b_type, grid_x=x, grid_y=y)
    
    if b_type == 'house_t1':
        island.status.pop_pioneers += cfg['capacity']
        
    db.session.add(new_b)
    db.session.commit()
    
    return jsonify({'message': 'Built successfully', 'coins': current_user.silver_coins})

# 7. 游戏时间流逝 (Tick)
@app.route('/api/game/tick', methods=['POST'])
@token_required
def process_tick(current_user):
    island = Island.query.filter_by(user_id=current_user.id).first()
    status = island.status
    buildings = Building.query.filter_by(island_id=island.id).all()
    
    total_maintenance = 0
    total_tax = 0
    
    # 计算产出和维护费
    for b in buildings:
        cfg = GAME_CONFIG['buildings'].get(b.type)
        if not cfg: continue
        
        total_maintenance += cfg['maintenance']
        
        # 消耗原料
        for res, amt in cfg.get('input', {}).items():
            curr_val = getattr(status, res, 0)
            setattr(status, res, max(0, curr_val - amt))
            
        # 增加产出
        for res, amt in cfg.get('output', {}).items():
            curr_val = getattr(status, res, 0)
            setattr(status, res, curr_val + amt)
            
    # 计算人口消耗与税收
    num_pioneer_houses = len([b for b in buildings if b.type == 'house_t1'])
    if num_pioneer_houses > 0:
        needs = GAME_CONFIG['needs']['pioneers']
        # 简单逻辑：只要有一种需求不满足，税收就减半 (这里仅做演示，可复杂化)
        fully_satisfied = True
        
        for res, amount_per_house in needs.items():
            total_needed = num_pioneer_houses * amount_per_house
            curr_res = getattr(status, res, 0)
            
            if curr_res >= total_needed:
                setattr(status, res, curr_res - total_needed)
            else:
                setattr(status, res, 0)
                fully_satisfied = False

        tax_per_house = GAME_CONFIG['buildings']['house_t1']['tax_per_head'] * 10 # 假设满员10人
        if not fully_satisfied:
            tax_per_house = tax_per_house // 2
            
        total_tax += num_pioneer_houses * tax_per_house

    net_income = total_tax - total_maintenance
    current_user.silver_coins += net_income
    
    db.session.commit()
    
    return jsonify({
        'status': status.to_dict(), 
        'coins': current_user.silver_coins,
        'log': f"Tax: {total_tax}, Maint: {total_maintenance}, Net: {net_income}"
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)