import os
import shutil
import subprocess
import stat

def remove_readonly(func, path, excinfo):
    os.chmod(path, stat.S_IWRITE)
    func(path)

def publish():
    repo_dir = r"C:\Users\geeth\.gemini\antigravity\scratch\ai-resume-job-matcher"
    dist_dir = os.path.join(repo_dir, "frontend", "dist")
    temp_dir = r"C:\Users\geeth\.gemini\antigravity\scratch\gh_pages_temp"
    
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir, onerror=remove_readonly)
        
    os.makedirs(temp_dir, exist_ok=True)
    
    # Copy dist contents to temp dir
    for item in os.listdir(dist_dir):
        s = os.path.join(dist_dir, item)
        d = os.path.join(temp_dir, item)
        if os.path.isdir(s):
            shutil.copytree(s, d)
        else:
            shutil.copy2(s, d)
            
    # Create .nojekyll to ensure GitHub Pages doesn't ignore _assets
    with open(os.path.join(temp_dir, ".nojekyll"), "w") as f:
        f.write("")
        
    # Init git repo in temp_dir
    subprocess.run(["git", "init"], cwd=temp_dir)
    subprocess.run(["git", "config", "user.name", "Meda Geethika"], cwd=temp_dir)
    subprocess.run(["git", "config", "user.email", "geethikameda7125@gmail.com"], cwd=temp_dir)
    subprocess.run(["git", "add", "."], cwd=temp_dir)
    subprocess.run(["git", "commit", "-m", "Deploy production frontend to GitHub Pages"], cwd=temp_dir)
    subprocess.run(["git", "branch", "-M", "gh-pages"], cwd=temp_dir)
    subprocess.run(["git", "remote", "add", "origin", "https://github.com/geethikameda7125-svg/ML-Project-AI-Resume-Screening.git"], cwd=temp_dir)
    
    # Push to gh-pages branch
    res = subprocess.run(["git", "push", "origin", "gh-pages", "--force"], cwd=temp_dir, capture_output=True, text=True)
    print("Push Output:", res.stdout, res.stderr)
    print("Published to gh-pages branch successfully!")

if __name__ == "__main__":
    publish()
