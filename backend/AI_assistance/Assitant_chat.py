from pinecone import Pinecone
from pinecone_plugins.assistant.models.chat import Message

# Initialize Pinecone and get the assistant
pc = Pinecone(api_key="pcsk_6jzqLN_HkohN8MKuupU2wE6m17413eDCgpvr8RhTXYajc9fxYbMVBBBMmfHKpxHH9vj4e")

assistant = pc.assistant.Assistant(
    assistant_name="example-assistant", 
)

# Create a message and get response
msg = Message(content="Are positive, negative, or neutral sentiments more common in posts?")
resp = assistant.chat(messages=[msg])

print(resp)