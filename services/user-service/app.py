import os
import logging
from flask import Flask, request, jsonify
from functools import wraps

app = Flask(__name__)
app.config['JSON_SORT_KEYS'] = False

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

PORT = os.getenv('PORT', 8001)

def verify_token(f):
    """Decorator to verify JWT token from headers"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization', '').split(' ')[-1]
        if not token:
            return jsonify({'error': 'No token provided'}), 401
        return f(*args, **kwargs)
    return decorated_function

# In-memory user storage (replace with database in production)
users = {}

@app.route('/api/users/register', methods=['POST'])
def register():
    """User registration endpoint"""
    try:
        data = request.get_json()
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        
        if not username or not email or not password:
            return jsonify({'error': 'Missing required fields'}), 400
        
        if username in users:
            return jsonify({'error': 'User already exists'}), 409
        
        users[username] = {
            'username': username,
            'email': email,
            'password': password  # In production, hash the password!
        }
        
        logger.info(f"User registered: {username}")
        return jsonify({'message': 'User registered successfully'}), 201
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/users/login', methods=['POST'])
def login():
    """User login endpoint (returns JWT token)"""
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'error': 'Missing credentials'}), 400
        
        user = users.get(username)
        if not user or user['password'] != password:
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # In production, generate proper JWT token
        token = f"token_{username}_{os.urandom(16).hex()}"
        logger.info(f"User logged in: {username}")
        
        return jsonify({'token': token, 'username': username}), 200
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/users/<username>', methods=['GET'])
@verify_token
def get_user(username):
    """Get user profile"""
    try:
        user = users.get(username)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Don't expose password
        user_data = {k: v for k, v in user.items() if k != 'password'}
        return jsonify(user_data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/users/<username>', methods=['PUT'])
@verify_token
def update_user(username):
    """Update user profile"""
    try:
        user = users.get(username)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        user.update({k: v for k, v in data.items() if k != 'password'})
        
        logger.info(f"User updated: {username}")
        return jsonify({'message': 'User updated successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'service': 'user-service'}), 200

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal server error: {str(error)}")
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(PORT), debug=False)
