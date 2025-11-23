# backend/app.py (更新后的完整内容，替换你现有 app.py 的所有内容)

import os
import datetime
import jwt
from functools import wraps

from flask import Flask, jsonify, request # 导入 request
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash # 用于密码哈希
from sqlalchemy import text # 用于 db_test 中执行原始 SQL 语句
from sqlalchemy.exc import IntegrityError # 用于处理数据库完整性错误

from config import Config # 导入配置模块

# --------------------------------------------------------------------------------
# 初始化 Flask 应用
# --------------------------------------------------------------------------------
app = Flask(__name__)
app.config.from_object(Config) # 从 config.py 加载配置

# 初始化 SQLAlchemy 数据库连接
db = SQLAlchemy(app)

# --------------------------------------------------------------------------------
# 数据库模型定义 (与 init.sql 保持一致以进行映射)
# --------------------------------------------------------------------------------
class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(100), unique=True)
    role = db.Column(db.String(20), default='user')
    created_at = db.Column(db.DateTime, default=datetime.datetime.now)
    last_login_at = db.Column(db.DateTime)

    # 定义与 Commands 的一对多关系
    commands = db.relationship('Command', backref='issuer', lazy='dynamic')

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login_at': self.last_login_at.isoformat() if self.last_login_at else None
        }

    def __repr__(self):
        return f'<User {self.username}>'

class Drone(db.Model):
    __tablename__ = 'drones'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    serial_number = db.Column(db.String(100), unique=True, nullable=False)
    model = db.Column(db.String(50))
    status = db.Column(db.String(50), default='offline')
    home_latitude = db.Column(db.Numeric(10, 8))
    home_longitude = db.Column(db.Numeric(11, 8))
    video_feed_url = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.datetime.now)
    last_config_update = db.Column(db.DateTime, default=datetime.datetime.now)

    # 定义与 DroneTelemetry 和 Commands 的关系
    # 'uselist=False' 表示这对关系返回的是单条记录，而不是列表
    # 'primaryjoin' 明确了 JOIN 条件，确保获取的是最新的 telemetry (因为 drone_id 是 unique 的)
    telemetry = db.relationship('DroneTelemetry', backref='drone', lazy=True, uselist=False,
                                primaryjoin="Drone.id==DroneTelemetry.drone_id")
    commands = db.relationship('Command', backref='drone', lazy='dynamic')

    def to_dict(self, include_telemetry=False):
        data = {
            'id': self.id,
            'name': self.name,
            'serial_number': self.serial_number,
            'model': self.model,
            'status': self.status,
            'home_latitude': str(self.home_latitude) if self.home_latitude else None,
            'home_longitude': str(self.home_longitude) if self.home_longitude else None,
            'video_feed_url': self.video_feed_url,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_config_update': self.last_config_update.isoformat() if self.last_config_update else None
        }
        if include_telemetry and self.telemetry:
            data['latest_telemetry'] = self.telemetry.to_dict()
        else:
            data['latest_telemetry'] = None
        return data

    def __repr__(self):
        return f'<Drone {self.name}>'

class DroneTelemetry(db.Model):
    __tablename__ = 'drone_telemetry'
    id = db.Column(db.Integer, primary_key=True)
    drone_id = db.Column(db.Integer, db.ForeignKey('drones.id'), nullable=False, unique=True, index=True) # unique=True 确保每架无人机只有最新的遥测记录
    current_latitude = db.Column(db.Numeric(10, 8), nullable=False)
    current_longitude = db.Column(db.Numeric(11, 8), nullable=False)
    current_altitude = db.Column(db.Numeric(7, 2), default=0.0)
    speed = db.Column(db.Numeric(7, 2), default=0.0)
    battery_level = db.Column(db.Integer, default=100)
    flight_mode = db.Column(db.String(50), default='manual')
    is_flying = db.Column(db.Boolean, default=False)
    error_message = db.Column(db.Text)
    updated_at = db.Column(db.DateTime, default=datetime.datetime.now, onupdate=datetime.datetime.now)

    def to_dict(self):
        return {
            'id': self.id,
            'drone_id': self.drone_id,
            'current_latitude': str(self.current_latitude),
            'current_longitude': str(self.current_longitude),
            'current_altitude': str(self.current_altitude),
            'speed': str(self.speed),
            'battery_level': self.battery_level,
            'flight_mode': self.flight_mode,
            'is_flying': self.is_flying,
            'error_message': self.error_message,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    def __repr__(self):
        return f'<DroneTelemetry drone_id={self.drone_id}>'

class Command(db.Model):
    __tablename__ = 'commands'
    id = db.Column(db.Integer, primary_key=True)
    drone_id = db.Column(db.Integer, db.ForeignKey('drones.id'), nullable=False, index=True)
    command_type = db.Column(db.String(50), nullable=False)
    target_latitude = db.Column(db.Numeric(10, 8))
    target_longitude = db.Column(db.Numeric(11, 8))
    target_altitude = db.Column(db.Numeric(7, 2))
    target_speed = db.Column(db.Numeric(7, 2))
    status = db.Column(db.String(50), default='pending') # pending, sent, acknowledged, executing, completed, failed
    issued_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    issued_at = db.Column(db.DateTime, default=datetime.datetime.now)
    executed_at = db.Column(db.DateTime)
    completion_message = db.Column(db.Text)

    def to_dict(self, include_issuer=False):
        data = {
            'id': self.id,
            'drone_id': self.drone_id,
            'command_type': self.command_type,
            'target_latitude': str(self.target_latitude) if self.target_latitude else None,
            'target_longitude': str(self.target_longitude) if self.target_longitude else None,
            'target_altitude': str(self.target_altitude) if self.target_altitude else None,
            'target_speed': str(self.target_speed) if self.target_speed else None,
            'status': self.status,
            'issued_by': self.issued_by,
            'issued_at': self.issued_at.isoformat() if self.issued_at else None,
            'executed_at': self.executed_at.isoformat() if self.executed_at else None,
            'completion_message': self.completion_message
        }
        if include_issuer and self.issuer: # issuer 是通过 backref 关系得到的 User 对象
            data['issuer_username'] = self.issuer.username
        return data

    def __repr__(self):
        return f'<Command {self.command_type} for Drone {self.drone_id}>'

# --------------------------------------------------------------------------------
# JWT 认证辅助函数
# --------------------------------------------------------------------------------

def token_required(f):
    """
    一个装饰器，用于保护需要认证的 API 路由。
    它检查请求头中的 'x-access-token' 或 'Authorization: Bearer <token>'。
    如果 token 有效，它会将当前用户对象作为第一个参数传递给被装饰的视图函数。
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'x-access-token' in request.headers:
            token = request.headers['x-access-token']
        elif 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header and auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]

        if not token:
            app.logger.warning("Token is missing in request headers.")
            return jsonify({'message': 'Token is missing!'}), 401
        
        try:
            # 解码 JWT token
            data = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=["HS256"])
            current_user = User.query.filter_by(id=data['user_id']).first()
            if not current_user:
                app.logger.warning(f"User with ID {data['user_id']} not found.")
                return jsonify({'message': 'User not found!'}), 401
        except jwt.ExpiredSignatureError:
            app.logger.warning("Token has expired.")
            return jsonify({'message': 'Token has expired!'}), 401
        except jwt.InvalidTokenError:
            app.logger.warning("Token is invalid.")
            return jsonify({'message': 'Token is invalid!'}), 401
        except Exception as e:
            app.logger.error(f"Error decoding token: {e}")
            return jsonify({'message': f'An error occurred: {e}'}), 500

        return f(current_user, *args, **kwargs)
    return decorated

# --------------------------------------------------------------------------------
# API 路由
# --------------------------------------------------------------------------------

# 1. 根路由 (保留)
@app.route('/')
def hello_world():
    return jsonify({"message": "Welcome to Drone Cluster Platform API!"})

# 2. Ping 路由 (保留)
@app.route('/api/ping')
def ping():
    return jsonify({"message": "pong", "status": "ok"})

# 3. 数据库测试路由 (更新为 SQLAlchemy)
@app.route('/api/db_test')
def db_test():
    try:
        # 使用 SQLAlchemy 的查询来测试数据库连接
        # 执行一个简单的查询，例如获取用户数量
        user_count = db.session.query(User).count()
        # 尝试执行一个原始的 SELECT 1 来确保底层连接也可用
        db.session.execute(text('SELECT 1')) 
        return jsonify({"message": f"Database connection successful! Users count: {user_count}", "status": "ok"})
    except Exception as e:
        app.logger.error(f"Database connection failed: {e}")
        # 在调试模式下，可以返回更详细的错误信息
        error_message = str(e) if app.config['DEBUG'] else "An error occurred during database connection test."
        return jsonify({"message": f"Database connection failed: {error_message}", "status": "error"}), 500

# 4. 用户注册 API
@app.route('/api/register', methods=['POST'])
def register_user():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

    if not username or not password:
        return jsonify({'message': 'Missing username or password'}), 400

    # 检查用户名是否已存在
    if User.query.filter_by(username=username).first():
        return jsonify({'message': 'Username already exists'}), 409
    
    # 检查邮箱是否已存在 (如果邮箱是可选，则根据需要处理)
    if email and User.query.filter_by(email=email).first():
        return jsonify({'message': 'Email already exists'}), 409

    # 对密码进行哈希处理
    hashed_password = generate_password_hash(password, method='scrypt') # 'scrypt' 是更现代的哈希方法，比 'pbkdf2:sha256' 更安全

    new_user = User(username=username, email=email, password_hash=hashed_password)
    db.session.add(new_user)
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error registering user {username}: {e}")
        return jsonify({'message': 'Error registering user', 'details': str(e)}), 500

    return jsonify({'message': 'User registered successfully!'}), 201

# 5. 用户登录 API
@app.route('/api/login', methods=['POST'])
def login_user():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'message': 'Missing username or password'}), 400

    user = User.query.filter_by(username=username).first()

    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({'message': 'Invalid credentials'}), 401
    
    # 生成 JWT Token
    token_payload = {
        'user_id': user.id,
        'username': user.username,
        'role': user.role,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(seconds=app.config['JWT_ACCESS_TOKEN_EXPIRES'])
    }
    # app.config['JWT_SECRET_KEY'] 会从 config.py 中读取，config.py 又从 .env 中读取 SECRET_KEY
    token = jwt.encode(token_payload, app.config['JWT_SECRET_KEY'], algorithm="HS256")

    # 更新用户的最后登录时间
    user.last_login_at = datetime.datetime.now()
    db.session.commit()

    return jsonify({
        'message': 'Login successful!',
        'token': token,
        'user_id': user.id,
        'username': user.username,
        'role': user.role
    }), 200

# 6. 受保护的测试路由 (需要有效的 JWT Token)
@app.route('/api/protected', methods=['GET'])
@token_required
def protected_route(current_user): # 装饰器会将 current_user 传递进来
    return jsonify({
        'message': 'You are authorized and accessed a protected route!',
        'user_id': current_user.id,
        'username': current_user.username,
        'role': current_user.role
    }), 200

# --------------------------------------------------------------------
# 新增：无人机 (Drones) 管理 API
# --------------------------------------------------------------------

# 7. 创建无人机
@app.route('/api/drones', methods=['POST'])
@token_required
def create_drone(current_user):
    data = request.get_json()
    name = data.get('name')
    serial_number = data.get('serial_number')
    model = data.get('model')
    home_latitude = data.get('home_latitude')
    home_longitude = data.get('home_longitude')
    video_feed_url = data.get('video_feed_url')

    if not name or not serial_number:
        return jsonify({'message': 'Missing name or serial_number'}), 400

    # 检查名称或序列号是否已存在
    existing_drone = Drone.query.filter((Drone.name == name) | (Drone.serial_number == serial_number)).first()
    if existing_drone:
        return jsonify({'message': 'Drone with this name or serial number already exists'}), 409

    new_drone = Drone(
        name=name,
        serial_number=serial_number,
        model=model,
        home_latitude=home_latitude,
        home_longitude=home_longitude,
        video_feed_url=video_feed_url,
        status='offline', # 默认状态
        created_at=datetime.datetime.now(),
        last_config_update=datetime.datetime.now()
    )
    db.session.add(new_drone)
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error creating drone {name}: {e}")
        return jsonify({'message': 'Error creating drone', 'details': str(e)}), 500

    return jsonify({'message': 'Drone created successfully!', 'drone': new_drone.to_dict()}), 201

# 8. 获取所有无人机
@app.route('/api/drones', methods=['GET'])
@token_required
def get_drones(current_user):
    drones = Drone.query.all()
    # 也可以根据查询参数决定是否包含遥测数据
    include_telemetry = request.args.get('include_telemetry', 'false').lower() == 'true'
    return jsonify([drone.to_dict(include_telemetry=include_telemetry) for drone in drones]), 200

# 9. 获取单个无人机详情
@app.route('/api/drones/<int:drone_id>', methods=['GET'])
@token_required
def get_drone(current_user, drone_id):
    drone = Drone.query.get(drone_id)
    if not drone:
        return jsonify({'message': 'Drone not found!'}), 404
    
    include_telemetry = request.args.get('include_telemetry', 'false').lower() == 'true'
    return jsonify(drone.to_dict(include_telemetry=include_telemetry)), 200

# 10. 更新无人机信息
@app.route('/api/drones/<int:drone_id>', methods=['PUT'])
@token_required
def update_drone(current_user, drone_id):
    drone = Drone.query.get(drone_id)
    if not drone:
        return jsonify({'message': 'Drone not found!'}), 404

    data = request.get_json()
    try:
        if 'name' in data:
            drone.name = data['name']
        if 'serial_number' in data:
            drone.serial_number = data['serial_number']
        if 'model' in data:
            drone.model = data['model']
        if 'status' in data:
            drone.status = data['status']
        if 'home_latitude' in data:
            drone.home_latitude = data['home_latitude']
        if 'home_longitude' in data:
            drone.home_longitude = data['home_longitude']
        if 'video_feed_url' in data:
            drone.video_feed_url = data['video_feed_url']
        
        drone.last_config_update = datetime.datetime.now() # 更新配置更新时间
        db.session.commit()
    except IntegrityError: # 捕获唯一性约束错误
        db.session.rollback()
        return jsonify({'message': 'A drone with the updated name or serial number already exists.'}), 409
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error updating drone {drone_id}: {e}")
        return jsonify({'message': 'Error updating drone', 'details': str(e)}), 500

    return jsonify({'message': 'Drone updated successfully!', 'drone': drone.to_dict()}), 200

# 11. 删除无人机
@app.route('/api/drones/<int:drone_id>', methods=['DELETE'])
@token_required
def delete_drone(current_user, drone_id):
    drone = Drone.query.get(drone_id)
    if not drone:
        return jsonify({'message': 'Drone not found!'}), 404

    try:
        # 在删除无人机前，需要删除所有关联的遥测数据和指令
        # SQLAchemay 的 cascade delete 可以在模型定义中设置，但这里手动处理更清晰
        DroneTelemetry.query.filter_by(drone_id=drone_id).delete()
        Command.query.filter_by(drone_id=drone_id).delete()
        db.session.delete(drone)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error deleting drone {drone_id}: {e}")
        return jsonify({'message': 'Error deleting drone', 'details': str(e)}), 500

    return jsonify({'message': 'Drone deleted successfully!'}), 200

# --------------------------------------------------------------------
# 新增：无人机遥测 (Telemetry) API
# --------------------------------------------------------------------

# 12. 上传最新遥测数据
@app.route('/api/drones/<int:drone_id>/telemetry', methods=['POST'])
@token_required
def upload_telemetry(current_user, drone_id):
    drone = Drone.query.get(drone_id)
    if not drone:
        return jsonify({'message': 'Drone not found!'}), 404

    data = request.get_json()
    required_fields = ['current_latitude', 'current_longitude', 'current_altitude', 'battery_level']
    if not all(field in data for field in required_fields):
        return jsonify({'message': f'Missing required telemetry fields: {", ".join(required_fields)}'}), 400

    # 检查是否存在该无人机的遥测记录，如果有则更新，没有则创建
    telemetry = DroneTelemetry.query.filter_by(drone_id=drone_id).first()
    
    if not telemetry:
        telemetry = DroneTelemetry(drone_id=drone_id)
        db.session.add(telemetry)

    # 更新字段
    telemetry.current_latitude = data['current_latitude']
    telemetry.current_longitude = data['current_longitude']
    telemetry.current_altitude = data['current_altitude']
    telemetry.speed = data.get('speed', telemetry.speed)
    telemetry.battery_level = data['battery_level']
    telemetry.flight_mode = data.get('flight_mode', telemetry.flight_mode)
    telemetry.is_flying = data.get('is_flying', telemetry.is_flying)
    telemetry.error_message = data.get('error_message', telemetry.error_message)
    telemetry.updated_at = datetime.datetime.now() # 明确更新时间

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error uploading telemetry for drone {drone_id}: {e}")
        return jsonify({'message': 'Error uploading telemetry', 'details': str(e)}), 500
    
    # 收到遥测更新后，可以更新无人机状态为 'online' 或其他
    if drone.status == 'offline':
        drone.status = 'online'
        db.session.commit() # 再次提交以保存无人机状态变化

    return jsonify({'message': 'Telemetry updated successfully!', 'telemetry': telemetry.to_dict()}), 200

# 13. 获取指定无人机的最新遥测数据
@app.route('/api/drones/<int:drone_id>/telemetry/latest', methods=['GET'])
@token_required
def get_latest_telemetry(current_user, drone_id):
    telemetry = DroneTelemetry.query.filter_by(drone_id=drone_id).first()
    if not telemetry:
        return jsonify({'message': 'Telemetry data not found for this drone!'}), 404
    
    return jsonify(telemetry.to_dict()), 200

# --------------------------------------------------------------------
# 新增：无人机指令 (Commands) API
# --------------------------------------------------------------------

# 14. 发送控制指令
@app.route('/api/drones/<int:drone_id>/commands', methods=['POST'])
@token_required
def issue_command(current_user, drone_id):
    drone = Drone.query.get(drone_id)
    if not drone:
        return jsonify({'message': 'Drone not found!'}), 404
    
    data = request.get_json()
    command_type = data.get('command_type')
    if not command_type:
        return jsonify({'message': 'Missing command_type'}), 400

    new_command = Command(
        drone_id=drone_id,
        command_type=command_type,
        target_latitude=data.get('target_latitude'),
        target_longitude=data.get('target_longitude'),
        target_altitude=data.get('target_altitude'),
        target_speed=data.get('target_speed'),
        status='pending', # 初始状态为 pending
        issued_by=current_user.id, # 记录是谁发出的命令
        issued_at=datetime.datetime.now()
    )
    db.session.add(new_command)
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error issuing command for drone {drone_id}: {e}")
        return jsonify({'message': 'Error issuing command', 'details': str(e)}), 500

    return jsonify({'message': 'Command issued successfully!', 'command': new_command.to_dict()}), 201

# 15. 获取指定无人机的所有指令 (历史指令)
@app.route('/api/drones/<int:drone_id>/commands', methods=['GET'])
@token_required
def get_drone_commands(current_user, drone_id):
    drone = Drone.query.get(drone_id)
    if not drone:
        return jsonify({'message': 'Drone not found!'}), 404

    commands = Command.query.filter_by(drone_id=drone_id).order_by(Command.issued_at.desc()).all()
    # 可以在此处添加 include_issuer 参数来决定是否返回发行者信息
    return jsonify([cmd.to_dict(include_issuer=True) for cmd in commands]), 200

# 16. 更新指令状态 (由无人机/网关或管理员调用)
@app.route('/api/commands/<int:command_id>/status', methods=['PUT'])
@token_required
def update_command_status(current_user, command_id):
    command = Command.query.get(command_id)
    if not command:
        return jsonify({'message': 'Command not found!'}), 404
    
    data = request.get_json()
    new_status = data.get('status')
    completion_message = data.get('completion_message')

    if not new_status:
        return jsonify({'message': 'Missing new status'}), 400
    
    # 简单验证状态转换 (可以根据需要增加更复杂的业务逻辑)
    valid_statuses = ['pending', 'sent', 'acknowledged', 'executing', 'completed', 'failed']
    if new_status not in valid_statuses:
        return jsonify({'message': f'Invalid status. Must be one of: {", ".join(valid_statuses)}'}), 400

    command.status = new_status
    if completion_message:
        command.completion_message = completion_message
    if new_status in ['completed', 'failed']:
        command.executed_at = datetime.datetime.now() # 如果命令完成或失败，则记录执行时间
    
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error updating command {command_id} status: {e}")
        return jsonify({'message': 'Error updating command status', 'details': str(e)}), 500

    return jsonify({'message': 'Command status updated successfully!', 'command': command.to_dict()}), 200

# --------------------------------------------------------------------
# 应用启动 (Gunicorn 将取代 if __name__ == '__main__':)
# --------------------------------------------------------------------