from flask import Blueprint, request, jsonify, current_app
from db import get_collection
import jwt
import os
from jwt import ExpiredSignatureError, InvalidTokenError
from datetime import datetime, timedelta

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
    # Optional range support: startDate and endDate (inclusive)
    start_date = request.args.get('startDate')
    end_date = request.args.get('endDate')

    # Build query filter
    query_filter = {}
    # If a specific date is provided, keep older behavior (exact match)
    if date:
        query_filter['date'] = date
    else:
        # Helper to expand YYYY-MM into start and end YYYY-MM-DD
        def expand_month_range(s):
            if not s or len(s) != 7:
                return None, None
            try:
                y, m = map(int, s.split('-'))
                start = datetime(y, m, 1)
                if m == 12:
                    next_month = datetime(y + 1, 1, 1)
                else:
                    next_month = datetime(y, m + 1, 1)
                last = next_month - timedelta(days=1)
                return start.strftime('%Y-%m-%d'), last.strftime('%Y-%m-%d')
            except Exception:
                return None, None

        # Both start and end provided -> range
        if start_date and end_date:
            s_start, s_end = expand_month_range(start_date)
            e_start, e_end = expand_month_range(end_date)
            # If either was month-only and expansion succeeded, use expanded values
            if s_start and s_end and (len(start_date) == 7):
                start_val = s_start
            else:
                start_val = start_date

            if e_start and e_end and (len(end_date) == 7):
                end_val = e_end
            else:
                end_val = end_date

            if start_val and end_val:
                query_filter['date'] = {'$gte': start_val, '$lte': end_val}
        elif start_date:
            # Single start provided -> from start_date to infinity (or end of month if month-only)
            s_start, s_end = expand_month_range(start_date)
            if s_start and s_end:
                query_filter['date'] = {'$gte': s_start, '$lte': s_end}
            else:
                query_filter['date'] = {'$gte': start_date}
        elif end_date:
            # Single end provided -> up to end_date (or end of month if month-only)
            e_start, e_end = expand_month_range(end_date)
            if e_end:
                query_filter['date'] = {'$lte': e_end}
            else:
                query_filter['date'] = {'$lte': end_date}

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
            # Add any additional fields from the request, excluding those explicitly handled
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


@batches_bp.route('/batches/<batch_id>/complete', methods=['POST'])
def mark_batch_as_completed(batch_id):
    """Mark a batch as completed."""
    payload, error, status_code = verify_token()
    if error:
        return jsonify(error), status_code

    try:
        from bson import ObjectId
        batches_collection = get_collection('batches')

        # Determine object id type
        try:
            batch_object_id = ObjectId(batch_id)
        except:
            batch_object_id = batch_id

        # Update the batch to set completed flag and timestamp
        update_data = {
            '$set': {
                'completed': True,
                'completedAt': datetime.utcnow().isoformat(),
                'completedBy': payload.get('email')
            }
        }

        result = batches_collection.update_one({'_id': batch_object_id}, update_data)

        if result.matched_count == 0:
            return jsonify({'error': 'batch not found'}), 404

        # Return the updated batch
        batch = batches_collection.find_one({'_id': batch_object_id})
        if '_id' in batch:
            batch['_id'] = str(batch['_id'])

        return jsonify(batch)

    except Exception as e:
        current_app.logger.error(f"Error marking batch {batch_id} as completed: {str(e)}")
        return jsonify({'error': 'internal server error'}), 500


@batches_bp.route('/batches/<batch_id>', methods=['DELETE'])
def delete_batch(batch_id):
    """Delete a batch by ID."""
    payload, error, status_code = verify_token()
    if error:
        return jsonify(error), status_code

    try:
        from bson import ObjectId
        batches_collection = get_collection('batches')

        try:
            batch_object_id = ObjectId(batch_id)
        except:
            batch_object_id = batch_id

        result = batches_collection.delete_one({'_id': batch_object_id})

        if result.deleted_count == 0:
            return jsonify({'error': 'batch not found'}), 404

        return jsonify({'message': 'batch deleted successfully', 'batch_id': str(batch_object_id)})

    except Exception as e:
        current_app.logger.error(f"Error deleting batch {batch_id}: {str(e)}")
        return jsonify({'error': 'internal server error'}), 500


@batches_bp.route('/batches/<batch_id>', methods=['PUT'])
def update_batch(batch_id):
    """Update batch fields."""
    payload, error, status_code = verify_token()
    if error:
        return jsonify(error), status_code

    data = request.get_json() or {}

    # Allowed fields to update
    allowed_fields = ['date', 'dayType', 'batchType', 'students', 'notes']
    update_fields = {k: v for k, v in data.items() if k in allowed_fields}

    if not update_fields:
        return jsonify({'error': 'no valid fields to update'}), 400

    try:
        from bson import ObjectId
        batches_collection = get_collection('batches')

        try:
            batch_object_id = ObjectId(batch_id)
        except:
            batch_object_id = batch_id

        # Add metadata
        update_fields['lastModifiedAt'] = datetime.utcnow().isoformat()
        update_fields['lastModifiedBy'] = payload.get('email')

        result = batches_collection.update_one(
            {'_id': batch_object_id},
            {'$set': update_fields}
        )

        if result.matched_count == 0:
            return jsonify({'error': 'batch not found'}), 404

        batch = batches_collection.find_one({'_id': batch_object_id})
        if '_id' in batch:
            batch['_id'] = str(batch['_id'])

        return jsonify(batch)

    except Exception as e:
        current_app.logger.error(f"Error updating batch {batch_id}: {str(e)}")
        return jsonify({'error': 'internal server error'}), 500


@batches_bp.route('/students/search', methods=['GET', 'OPTIONS'])
def search_students():
    """Search students across all batches by partial name or phone."""
    # Allow preflight OPTIONS without auth to satisfy browser CORS checks
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    # Verify authentication for actual GET requests
    payload, error, status_code = verify_token()
    if error:
        return jsonify(error), status_code

    name_q = request.args.get('name')
    phone_q = request.args.get('phone')

    try:
        batches_collection = get_collection('batches')

        # Simple scan-through implementation: unwind students arrays and match substrings
        cursor = batches_collection.find({}, {'students': 1})
        found = {}
        name_q_l = name_q.lower() if name_q else None
        phone_q_l = phone_q.lower() if phone_q else None

        for doc in cursor:
            for s in doc.get('students', []):
                try:
                    s_name = (s.get('name') or '').lower()
                    s_phone = (s.get('phone') or s.get('phoneNumber') or '').lower()
                except Exception:
                    s_name = ''
                    s_phone = ''

                match = False
                if name_q_l and name_q_l in s_name:
                    match = True
                if phone_q_l and phone_q_l in s_phone:
                    match = True

                if match:
                    sid = s.get('id') or s.get('studentId') or None
                    # Deduplicate by id or by compound key
                    key = sid or f"{s.get('name','')}-{s.get('phone','')}-{s.get('email','')}"
                    if key not in found:
                        # keep only useful fields
                        found[key] = {
                            'id': s.get('id'),
                            'name': s.get('name'),
                            'studentId': s.get('studentId'),
                            'phone': s.get('phone') or s.get('phoneNumber'),
                            'email': s.get('email'),
                            'address': s.get('address'),
                            'bagNumber': s.get('bagNumber'),
                            'time': s.get('time'),
                            'numberOfClothes': s.get('numberOfClothes')
                        }

        # Return as list, limit to 50 matches
        results = list(found.values())[:50]
        return jsonify(results)

    except Exception as e:
        current_app.logger.error(f"Error searching students: {str(e)}")
        return jsonify({'error': 'internal server error'}), 500
