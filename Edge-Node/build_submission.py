import shutil
import os

PROJECT_NAME = "NHAI_OSBAF_Submission"

# Files and folders to EXCLUDE from the final zip
IGNORE_PATTERNS = shutil.ignore_patterns(
    "__pycache__", 
    "*.pyc", 
    "*.bak", 
    ".git", 
    "_deprecated", 
    "tests", 
    "venv", 
    ".venv",
    ".env",
    "build_submission.py" # Don't include the builder itself
)

def clean_and_zip():
    print("🧹 Cleaning directory and ignoring bloat files...")
    
    staging_dir = f"./{PROJECT_NAME}"
    
    # Remove old staging dir if it exists
    if os.path.exists(staging_dir):
        shutil.rmtree(staging_dir)
        
    # Copy all clean files to a temporary folder
    shutil.copytree(".", staging_dir, ignore=IGNORE_PATTERNS)
    
    print("📦 Zipping the clean project for Hackathon Submission...")
    # Create the ZIP archive
    shutil.make_archive(PROJECT_NAME, 'zip', staging_dir)
    
    # Delete the temporary staging folder
    shutil.rmtree(staging_dir)
    
    print("===================================================")
    print(f"✅ SUCCESS! Your submission is ready: {PROJECT_NAME}.zip")
    print("===================================================")

if __name__ == "__main__":
    clean_and_zip()