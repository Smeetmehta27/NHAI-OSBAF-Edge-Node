import uvicorn

if __name__ == "__main__":
    print("===================================================")
    print("🚀 Starting NHAI Datalake 3.0 Edge Node (OSBAF)...")
    print("🌐 Access the Edge Dashboard at: http://localhost:8000")
    print("===================================================")
    
    # Run the FastAPI app
    uvicorn.run("backend.api.main:app", host="0.0.0.0", port=8000, reload=True)