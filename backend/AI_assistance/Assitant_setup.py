from pinecone import Pinecone

pc = Pinecone(api_key="pcsk_6jzqLN_HkohN8MKuupU2wE6m17413eDCgpvr8RhTXYajc9fxYbMVBBBMmfHKpxHH9vj4e")

# Try to create the assistant, handle if it already exists
try:
    assistant = pc.assistant.create_assistant(
        assistant_name="example-assistant", 
        instructions="Answer directly and succinctly. Do not provide any additional information. Response based on the data provided do not make up any information.", # Description or directive for the assistant to apply to all responses.
        timeout=30 # Wait 30 seconds for assistant operation to complete.
    )
    print("Assistant created successfully!")
except Exception as e:
    if "ALREADY_EXISTS" in str(e):
        print("Assistant already exists, proceeding...")
    else:
        print(f"Error creating assistant: {e}")
        raise

# Get the assistant.
assistant = pc.assistant.Assistant(
    assistant_name="example-assistant", 
)

# Upload a file.
try:
    response = assistant.upload_file(
        file_path=r"S:\FutureObjects\TrackFutura\Sample Data\LinkedIn posts.json",
        timeout=None
    )
    print("File uploaded successfully!")
    print(f"Upload response: {response}")
except Exception as e:
    print(f"Error uploading file: {e}")