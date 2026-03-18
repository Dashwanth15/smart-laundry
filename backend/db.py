import os
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import ServerSelectionTimeoutError, DuplicateKeyError

# ensure environment variables from .env are available when this module is imported
load_dotenv()

_db = None
_is_in_memory = False


def init_db(app=None):
	"""Initialise a MongoDB client. If MONGO_URI not set or connection fails,
	fall back to an in-memory dict for fast local testing.
	"""
	global _db, _is_in_memory
	mongo_uri = os.environ.get('MONGO_URI')
	if not mongo_uri:
		print('MONGO_URI not set — using in-memory fallback (not persistent)')
		_db = InMemoryDB()
		_is_in_memory = True
		return

	try:
		client = MongoClient(mongo_uri, serverSelectionTimeoutMS=2000)
		# trigger connection
		client.server_info()
		# pick database from URI or default to 'laundry'
		# get_default_database() returns a Database or None; avoid truth-testing it
		try:
			default_db = client.get_default_database()
		except Exception:
			default_db = None
		db = default_db if default_db is not None else client['laundry']
		_db = db
		_is_in_memory = False
		ensure_indexes()
		print('Connected to MongoDB')
	except ServerSelectionTimeoutError:
		print('Could not connect to MongoDB — using in-memory fallback')
		_db = InMemoryDB()
		_is_in_memory = True


def ensure_indexes():
	"""Ensure the users collection has a unique index on email when using real MongoDB."""
	global _db, _is_in_memory
	if _is_in_memory or _db is None:
		return
	try:
		_db['users'].create_index('email', unique=True)
	except Exception:
		# index creation can fail if permissions or other issues; ignore for now
		pass


class InMemoryDB:
	def __init__(self):
		# support arbitrary named collections
		self._data = {}

	def collection(self, name):
		return InMemoryCollection(self._data.setdefault(name, []))


class InMemoryCollection:
	def __init__(self, store):
		self.store = store

	def find_one(self, query):
		for doc in self.store:
			if all(doc.get(k) == v for k, v in query.items()):
				return doc
		return None

	def insert_one(self, doc):
		# simple unique id
		doc = dict(doc)
		if any(d.get('email') == doc.get('email') for d in self.store):
			raise DuplicateKeyError('email dup')
		doc['_id'] = len(self.store) + 1
		self.store.append(doc)
		class Res:
			def __init__(self, inserted_id):
				self.inserted_id = inserted_id
		return Res(doc['_id'])


def get_collection(name: str):
	"""Return a collection by name; works with real MongoDB or the in-memory fallback."""
	global _db, _is_in_memory
	if _db is None:
		init_db()
	if _is_in_memory:
		return _db.collection(name)
	return _db[name]


def users_collection():
	return get_collection('users')

