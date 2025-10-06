from flask import Blueprint, request, jsonify, current_app
from db import get_collection
import jwt
import os
from jwt import ExpiredSignatureError, InvalidTokenError
from datetime import datetime

batches_bp = Blueprint('batches', __name__)


def verify_token():
    """Helper function to verify JWT token from Authorization header."""
    auth = request.headers.get('Authorization', '')
    if not auth.startswith('Bearer '):
        return None, {'error': 'missing token'}, 401
    
    token = auth.split(None, 1)[1]
    secret = os.environ.get('SECRET_KEY', current_app.config.get('SECRET_KEY', 'dev-secret'))
    
    try:
        payload = jwt.decode(token, secret, algorithms=['HS256'])
        return payload, None, None
    except ExpiredSignatureError:
        return None, {'error': 'token expired'}, 401
    except InvalidTokenError:
        return None, {'error': 'invalid token'}, 401


@batches_bp.route('/batches', methods=['GET'])
def get_batches():
    """Get batches based on date, dayType, and batchType query parameters."""
    # Verify authentication
    payload, error, status_code = verify_token()
    if error:
        return jsonify(error), status_code
    
    # Get query parameters
    date = request.args.get('date')
    day_type = request.args.get('dayType')
    batch_type = request.args.get('batchType')
    
    # Build query filter
    query_filter = {}
    if date:
        query_filter['date'] = date
    if day_type:
        query_filter['dayType'] = day_type
    if batch_type:
        query_filter['batchType'] = batch_type
    
    try:
        # Get batches collection
        batches_collection = get_collection('batches')
        
        # Find batches matching the criteria
        batches = list(batches_collection.find(query_filter))
        
        # Convert ObjectId to string for JSON serialization
        for batch in batches:
            if '_id' in batch:
                batch['_id'] = str(batch['_id'])
        
        return jsonify({
            'batches': batches,
            'count': len(batches),
            'filters': {
                'date': date,
                'dayType': day_type,
                'batchType': batch_type
            }
        })
    
    except Exception as e:
        current_app.logger.error(f"Error fetching batches: {str(e)}")
        return jsonify({'error': 'internal server error'}), 500


@batches_bp.route('/batches', methods=['POST'])
def create_batch():
    """Create a new batch."""
    # Verify authentication
    payload, error, status_code = verify_token()
    if error:
        return jsonify(error), status_code
    
    data = request.get_json() or {}
    
    # Validate required fields
    required_fields = ['date', 'dayType', 'batchType']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400
    
    try:
        # Add created timestamp and user info
        batch_data = {
            'date': data['date'],
            'dayType': data['dayType'],
            'batchType': data['batchType'],
            'createdAt': datetime.utcnow().isoformat(),
            'createdBy': payload.get('email'),
            # Add any additional fields from the request
            **{k: v for k, v in data.items() if k not in required_fields}
        }
        
        batches_collection = get_collection('batches')
        result = batches_collection.insert_one(batch_data)
        
        # Return the created batch
        batch_data['_id'] = str(result.inserted_id)
        return jsonify(batch_data), 201
    
    except Exception as e:
        current_app.logger.error(f"Error creating batch: {str(e)}")
        return jsonify({'error': 'internal server error'}), 500


@batches_bp.route('/batches/<batch_id>', methods=['GET'])
def get_batch_by_id(batch_id):
    """Get a specific batch by ID."""
    # Verify authentication
    payload, error, status_code = verify_token()
    if error:
        return jsonify(error), status_code
    
    try:
        from bson import ObjectId
        batches_collection = get_collection('batches')
        
        # Try to find by ObjectId first, then by string ID
        try:
            batch = batches_collection.find_one({'_id': ObjectId(batch_id)})
        except:
            batch = batches_collection.find_one({'_id': batch_id})
        
        if not batch:
            return jsonify({'error': 'batch not found'}), 404
        
        # Convert ObjectId to string
        if '_id' in batch:
            batch['_id'] = str(batch['_id'])
        
        return jsonify(batch)
    
    except Exception as e:
        current_app.logger.error(f"Error fetching batch {batch_id}: {str(e)}")
        return jsonify({'error': 'internal server error'}), 500


@batches_bp.route('/batches/<batch_id>/students', methods=['GET'])
def get_batch_students(batch_id):
    """Get all students for a specific batch."""
    # Verify authentication
    payload, error, status_code = verify_token()
    if error:
        return jsonify(error), status_code
    
    try:
        from bson import ObjectId
        batches_collection = get_collection('batches')
        
        # Find the batch first
        try:
            batch = batches_collection.find_one({'_id': ObjectId(batch_id)})
        except:
            batch = batches_collection.find_one({'_id': batch_id})
        
        if not batch:
            return jsonify({'error': 'batch not found'}), 404
        
        # Get students from the batch (assuming students are stored as an array in the batch document)
        students = batch.get('students', [])
        
        # If students are stored as references, you might need to look them up
        # For now, return the students array as is
        return jsonify({
            'batch_id': str(batch.get('_id')),
            'students': students,
            'count': len(students)
        })
    
    except Exception as e:
        current_app.logger.error(f"Error fetching students for batch {batch_id}: {str(e)}")
        return jsonify({'error': 'internal server error'}), 500


@batches_bp.route('/batches/<batch_id>/students', methods=['POST'])
def add_student_to_batch(batch_id):
    """Add a student to a specific batch."""
    # Verify authentication
    payload, error, status_code = verify_token()
    if error:
        return jsonify(error), status_code
    
    data = request.get_json() or {}
    
    # Validate required student data
    if not data.get('name'):
        return jsonify({'error': 'student name is required'}), 400
    
    try:
        from bson import ObjectId
        batches_collection = get_collection('batches')
        
        # Find the batch first
        try:
            batch = batches_collection.find_one({'_id': ObjectId(batch_id)})
            batch_object_id = ObjectId(batch_id)
        except:
            batch = batches_collection.find_one({'_id': batch_id})
            batch_object_id = batch_id
        
        if not batch:
            return jsonify({'error': 'batch not found'}), 404
        
        # Create student data
        student_data = {
            'id': str(ObjectId()),  # Generate a unique ID for the student
            'name': data['name'],
            'email': data.get('email', ''),
            'phone': data.get('phone', ''),
            'address': data.get('address', ''),
            'addedAt': datetime.utcnow().isoformat(),
            'addedBy': payload.get('email'),
            # Add any additional fields from the request
            **{k: v for k, v in data.items() if k not in ['name', 'email', 'phone', 'address']}
        }
        
        # Add student to the batch's students array
        result = batches_collection.update_one(
            {'_id': batch_object_id},
            {'$push': {'students': student_data}}
        )
        
        if result.modified_count == 0:
            return jsonify({'error': 'failed to add student to batch'}), 500
        
        return jsonify({
            'message': 'student added successfully',
            'student': student_data,
            'batch_id': str(batch_object_id)
        }), 201
    
    except Exception as e:
        current_app.logger.error(f"Error adding student to batch {batch_id}: {str(e)}")
        return jsonify({'error': 'internal server error'}), 500


@batches_bp.route('/batches/<batch_id>/students/<student_id>', methods=['DELETE'])
def remove_student_from_batch(batch_id, student_id):
    """Remove a student from a specific batch."""
    # Verify authentication
    payload, error, status_code = verify_token()
    if error:
        return jsonify(error), status_code
    
    try:
        from bson import ObjectId
        batches_collection = get_collection('batches')
        
        # Find the batch first
        try:
            batch_object_id = ObjectId(batch_id)
        except:
            batch_object_id = batch_id
        
        # Remove student from the batch's students array
        result = batches_collection.update_one(
            {'_id': batch_object_id},
            {'$pull': {'students': {'id': student_id}}}
        )
        
        if result.modified_count == 0:
            return jsonify({'error': 'student not found in batch or batch not found'}), 404
        
        return jsonify({
            'message': 'student removed successfully',
            'student_id': student_id,
            'batch_id': str(batch_object_id)
        })
    
    except Exception as e:
        current_app.logger.error(f"Error removing student {student_id} from batch {batch_id}: {str(e)}")
        return jsonify({'error': 'internal server error'}), 500


@batches_bp.route('/batches/<batch_id>/students/<student_id>', methods=['PUT'])
def update_student_in_batch(batch_id, student_id):
    """Update a student's information in a specific batch."""
    # Verify authentication
    payload, error, status_code = verify_token()
    if error:
        return jsonify(error), status_code
    
    data = request.get_json() or {}
    
    try:
        from bson import ObjectId
        batches_collection = get_collection('batches')
        
        # Find the batch first
        try:
            batch_object_id = ObjectId(batch_id)
        except:
            batch_object_id = batch_id
        
        # Create update data
        update_fields = {}
        allowed_fields = ['name', 'email', 'phone', 'address']
        for field in allowed_fields:
            if field in data:
                update_fields[f'students.$.{field}'] = data[field]
        
        if not update_fields:
            return jsonify({'error': 'no valid fields to update'}), 400
        
        # Add last modified info
        update_fields['students.$.lastModified'] = datetime.utcnow().isoformat()
        update_fields['students.$.lastModifiedBy'] = payload.get('email')
        
        # Update the specific student in the batch
        result = batches_collection.update_one(
            {'_id': batch_object_id, 'students.id': student_id},
            {'$set': update_fields}
        )
        
        if result.modified_count == 0:
            return jsonify({'error': 'student not found in batch or batch not found'}), 404
        
        return jsonify({
            'message': 'student updated successfully',
            'student_id': student_id,
            'batch_id': str(batch_object_id),
            'updated_fields': list(update_fields.keys())
        })
    
    except Exception as e:
        current_app.logger.error(f"Error updating student {student_id} in batch {batch_id}: {str(e)}")
        return jsonify({'error': 'internal server error'}), 500