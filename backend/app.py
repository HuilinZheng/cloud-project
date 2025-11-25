import os
import datetime
import json
import jwt
from functools import wraps
from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from flask_cors import CORS
from config import Config

app = Flask(__name__)
app.config.from_object(Config)
CORS(app)
db = SQLAlchemy(app)

# --- Models ---

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False)
    real_name = db.Column(db.String(50))
    student_id = db.Column(db.String(20))

class Training(db.Model):
    __tablename__ = 'trainings'
    id = db.Column(db.Integer, primary_key=True)
    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime, nullable=False)
    plan_content = db.Column(db.Text)

class Match(db.Model):
    __tablename__ = 'matches'
    id = db.Column(db.Integer, primary_key=True)
    match_time = db.Column(db.DateTime, nullable=False)
    opponent = db.Column(db.String(100))
    location = db.Column(db.String(100))

class Leave(db.Model):
    __tablename__ = 'leaves'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    training_id = db.Column(db.Integer, db.ForeignKey('trainings.id'))
    match_id = db.Column(db.Integer, db.ForeignKey('matches.id'))
    duration_hours = db.Column(db.Float)
    reason = db.Column(db.Text)
    status = db.Column(db.String(20), default='pending')
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    user = db.relationship('User', backref='leaves')
    training = db.relationship('Training')
    match = db.relationship('Match')

class MatchSignup(db.Model):
    __tablename__ = 'match_signups'
    id = db.Column(db.Integer, primary_key=True)
    match_id = db.Column(db.Integer, db.ForeignKey('matches.id'))
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    real_name = db.Column(db.String(50))
    student_id = db.Column(db.String(20))

class Venue(db.Model):
    __tablename__ = 'venues'
    id = db.Column(db.Integer, primary_key=True)
    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime, nullable=False)
    proof_photo_url = db.Column(db.Text)
    updated_by = db.Column(db.Integer, db.ForeignKey('users.id'))

class TeamPhoto(db.Model):
    __tablename__ = 'team_photos'
    id = db.Column(db.Integer, primary_key=True)
    photo_url = db.Column(db.Text, nullable=False)
    description = db.Column(db.Text)

class PersonalTraining(db.Model):
    __tablename__ = 'personal_trainings'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    item_name = db.Column(db.String(100), nullable=False)
    photo_url = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    user = db.relationship('User')

# --- Helper Functions ---

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

def role_required(roles):
    def decorator(f):
        @wraps(f)
        def wrapped(current_user, *args, **kwargs):
            if current_user.role not in roles:
                return jsonify({'message': 'Permission denied'}), 403
            return f(current_user, *args, **kwargs)
        return wrapped
    return decorator

# --- Routes ---

@app.route('/api/ping', methods=['GET'])
def ping():
    return jsonify({'status': 'ok', 'message': 'Basketball System Online'})

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    hashed = generate_password_hash(data['password'], method='scrypt')
    new_user = User(
        username=data['username'], 
        password_hash=hashed,
        role=data.get('role', 'player'),
        real_name=data.get('real_name', ''),
        student_id=data.get('student_id', '')
    )
    db.session.add(new_user)
    try:
        db.session.commit()
        return jsonify({'message': 'Registered successfully'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': str(e)}), 500

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
        'user': {
            'username': user.username, 
            'role': user.role,
            'real_name': user.real_name,
            'student_id': user.student_id
        }
    })

# --- 1. 日常训练模块 ---

@app.route('/api/trainings', methods=['GET'])
@token_required
def get_trainings(current_user):
    trainings = Training.query.order_by(Training.start_time.desc()).all()
    return jsonify([{
        'id': t.id,
        'start_time': t.start_time.strftime('%Y-%m-%d %H:%M'),
        'end_time': t.end_time.strftime('%Y-%m-%d %H:%M'),
        'plan_content': t.plan_content
    } for t in trainings])

# 注意：这里只保留这一个 create_training 函数
@app.route('/api/trainings', methods=['POST'])
@token_required
@role_required(['captain'])
def create_training(current_user):
    data = request.get_json()
    try:
        # 容错处理：不管前端发来的是 "2023-10-25 14:30" 还是 "2023-10-25T14:30"
        start_str = data['start_time'].replace('T', ' ')
        end_str = data['end_time'].replace('T', ' ')
        
        new_t = Training(
            start_time=datetime.datetime.strptime(start_str, '%Y-%m-%d %H:%M'),
            end_time=datetime.datetime.strptime(end_str, '%Y-%m-%d %H:%M'),
            plan_content=data['plan_content']
        )
        db.session.add(new_t)
        db.session.commit()
        return jsonify({'message': 'Training created'})
    except ValueError as e:
        print(f"Date Error: {e}") 
        return jsonify({'message': 'Invalid date format'}), 400
    except Exception as e:
        print(f"Error: {e}")
        db.session.rollback()
        return jsonify({'message': str(e)}), 500

@app.route('/api/trainings/<int:training_id>', methods=['DELETE'])
@token_required
@role_required(['captain'])
def delete_training(current_user, training_id):
    t = Training.query.get(training_id)
    if not t: return jsonify({'message': 'Not found'}), 404
    
    # 级联删除：先删除关联的请假条
    Leave.query.filter_by(training_id=training_id).delete()
    
    db.session.delete(t)
    db.session.commit()
    return jsonify({'message': 'Deleted successfully'})

@app.route('/api/leaves', methods=['POST'])
@token_required
@role_required(['player', 'captain', 'manager'])
def request_leave(current_user):
    data = request.get_json()
    new_leave = Leave(
        user_id=current_user.id,
        training_id=data.get('training_id'),
        match_id=data.get('match_id'),
        duration_hours=data['duration_hours'],
        reason=data['reason']
    )
    db.session.add(new_leave)
    db.session.commit()
    return jsonify({'message': 'Leave requested'})

@app.route('/api/leaves', methods=['GET'])
@token_required
def get_leaves(current_user):
    if current_user.role in ['captain', 'coach']:
        leaves = Leave.query.order_by(Leave.created_at.desc()).all()
    else:
        leaves = Leave.query.filter_by(user_id=current_user.id).order_by(Leave.created_at.desc()).all()
        
    return jsonify([{
        'id': l.id,
        'username': l.user.username,
        'real_name': l.user.real_name,
        'duration_hours': float(l.duration_hours),
        'reason': l.reason,
        'status': l.status,
        'type': '比赛' if l.match_id else ('训练' if l.training_id else '通用'),
        'related_info': (l.match.opponent if l.match_id else (l.training.start_time.strftime('%m-%d') if l.training_id else '-'))
    } for l in leaves])

# --- 2. 比赛事宜模块 ---

@app.route('/api/matches', methods=['GET'])
@token_required
def get_matches(current_user):
    matches = Match.query.order_by(Match.match_time).all()
    results = []
    for m in matches:
        signup = MatchSignup.query.filter_by(match_id=m.id, user_id=current_user.id).first()
        signups = MatchSignup.query.filter_by(match_id=m.id).all()
        signup_names = [s.real_name for s in signups]
        
        results.append({
            'id': m.id,
            'match_time': m.match_time.strftime('%Y-%m-%d %H:%M'),
            'opponent': m.opponent,
            'location': m.location,
            'is_signed_up': bool(signup),
            'participants': signup_names
        })
    return jsonify(results)

@app.route('/api/matches', methods=['POST'])
@token_required
@role_required(['captain'])
def create_match(current_user):
    data = request.get_json()
    try:
        # 同样加上时间格式容错处理
        match_time_str = data['match_time'].replace('T', ' ')
        
        new_m = Match(
            match_time=datetime.datetime.strptime(match_time_str, '%Y-%m-%d %H:%M'),
            opponent=data['opponent'],
            location=data['location']
        )
        db.session.add(new_m)
        db.session.commit()
        return jsonify({'message': 'Match created'})
    except ValueError:
        return jsonify({'message': 'Invalid date format'}), 400
        
@app.route('/api/matches/<int:match_id>', methods=['DELETE'])
@token_required
@role_required(['captain'])
def delete_match(current_user, match_id):
    m = Match.query.get(match_id)
    if not m: return jsonify({'message': 'Not found'}), 404
    
    try:
        # 级联删除：使用 synchronize_session=False 防止 Session 过期报错
        MatchSignup.query.filter_by(match_id=match_id).delete(synchronize_session=False)
        Leave.query.filter_by(match_id=match_id).delete(synchronize_session=False)
        
        db.session.commit() # 提交子记录删除
        
        db.session.delete(m)
        db.session.commit() # 提交主记录删除
        return jsonify({'message': 'Deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': str(e)}), 500

@app.route('/api/matches/<int:match_id>/signup', methods=['POST'])
@token_required
def signup_match(current_user, match_id):
    if current_user.role not in ['player', 'captain']:
        return jsonify({'message': 'Role not allowed to play'}), 403

    if not current_user.real_name or not current_user.student_id:
        return jsonify({'message': 'Please complete profile first'}), 400
        
    existing = MatchSignup.query.filter_by(match_id=match_id, user_id=current_user.id).first()
    if existing:
        return jsonify({'message': 'Already signed up'}), 400
        
    signup = MatchSignup(
        match_id=match_id,
        user_id=current_user.id,
        real_name=current_user.real_name,
        student_id=current_user.student_id
    )
    db.session.add(signup)
    db.session.commit()
    return jsonify({'message': 'Signed up successfully'})

# --- 3. 场地预约模块 ---

@app.route('/api/venues', methods=['GET'])
@token_required
def get_venues(current_user):
    venues = Venue.query.order_by(Venue.start_time.desc()).all()
    return jsonify([{
        'id': v.id,
        'start_time': v.start_time.strftime('%Y-%m-%d %H:%M'),
        'end_time': v.end_time.strftime('%Y-%m-%d %H:%M'),
        'proof_photo_url': v.proof_photo_url
    } for v in venues])

@app.route('/api/venues', methods=['POST'])
@token_required
@role_required(['captain', 'manager'])
def create_venue(current_user):
    data = request.get_json()
    try:
        new_v = Venue(
            start_time=datetime.datetime.strptime(data['start_time'], '%Y-%m-%d %H:%M'),
            end_time=datetime.datetime.strptime(data['end_time'], '%Y-%m-%d %H:%M'),
            proof_photo_url=data.get('proof_photo_url'),
            updated_by=current_user.id
        )
        db.session.add(new_v)
        db.session.commit()
        return jsonify({'message': 'Venue reservation updated'})
    except ValueError:
        return jsonify({'message': 'Invalid date format'}), 400

# --- 4. 风采 & 5. 个人打卡 ---

@app.route('/api/photos', methods=['GET'])
@token_required
def get_photos(current_user):
    photos = TeamPhoto.query.order_by(TeamPhoto.uploaded_at.desc()).all()
    return jsonify([{'id': p.id, 'url': p.photo_url, 'description': p.description} for p in photos])

@app.route('/api/photos', methods=['POST'])
@token_required
@role_required(['captain'])
def upload_team_photo(current_user):
    data = request.get_json()
    new_p = TeamPhoto(photo_url=data['url'], description=data.get('description'))
    db.session.add(new_p)
    db.session.commit()
    return jsonify({'message': 'Photo uploaded'})

@app.route('/api/personal_trainings', methods=['POST'])
@token_required
def log_personal_training(current_user):
    data = request.get_json()
    log = PersonalTraining(
        user_id=current_user.id,
        item_name=data['item_name'],
        photo_url=data.get('photo_url')
    )
    db.session.add(log)
    db.session.commit()
    return jsonify({'message': 'Training logged'})

@app.route('/api/personal_trainings', methods=['GET'])
@token_required
def get_personal_trainings(current_user):
    if current_user.role in ['captain', 'coach']:
        logs = PersonalTraining.query.order_by(PersonalTraining.created_at.desc()).all()
    else:
        logs = PersonalTraining.query.filter_by(user_id=current_user.id).order_by(PersonalTraining.created_at.desc()).all()
        
    return jsonify([{
        'id': l.id,
        'username': l.user.username,
        'real_name': l.user.real_name,
        'item_name': l.item_name,
        'photo_url': l.photo_url,
        'timestamp': l.created_at.strftime('%Y-%m-%d %H:%M')
    } for l in logs])

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)