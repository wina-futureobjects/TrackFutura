from LinkedInHandler import LinkedInPineconeDB, load_linkedin_posts_from_file

# Initialize
db = LinkedInPineconeDB(api_key="pcsk_78mXZf_N5w38HcHeJD6MniEjw3BBdiEGTpATqAyzhAWKnRZcsWjwASQnXwYkYf5r1hk5hA", index_name="linkedin-db")
db.create_index()

# Load and upload posts
posts = load_linkedin_posts_from_file("../Sample Data/LinkedIn posts.json")
db.upload_posts(posts)

# Search posts
results = db.search_posts("family business management", top_k=5)