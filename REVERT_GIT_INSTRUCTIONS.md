# Revert Today's Git Changes - Manual Steps

## Step 1: View today's commits
```bash
git log --oneline --since="today 00:00"
```

## Step 2: Find the last commit before today
```bash
git log --oneline --before="today 00:00" -1
```
Note the commit hash (e.g., abc1234)

## Step 3: Create a revert (Choose ONE option)

### Option A: Revert with new commit (RECOMMENDED - preserves history)
```bash
# This creates a new commit that undoes the changes
git revert HEAD~5..HEAD  # Replace 5 with the number of commits to revert
# OR
git revert <last-good-commit>..HEAD  # Replace with the hash from step 2
```

### Option B: Reset to previous state (DANGEROUS - rewrites history)
```bash
# WARNING: This permanently removes commits. Use only if you haven't shared the code
git reset --hard <last-good-commit>  # Replace with the hash from step 2
git push --force origin main  # Force push (dangerous!)
```

## Step 4: Push the revert
```bash
# For Option A (revert commit)
git push origin main

# For Option B (reset)
git push --force origin main  # BE VERY CAREFUL!
```

## To see what files were changed today:
```bash
git diff --name-only HEAD~5..HEAD  # Adjust the number
# OR
git diff --name-only <last-good-commit>..HEAD
```

## To see detailed changes:
```bash
git diff HEAD~5..HEAD  # See all changes
```

## Important Notes:
- **Option A (revert)** is safer as it preserves history
- **Option B (reset)** should only be used if you're absolutely sure no one else has pulled the changes
- Always make a backup before doing destructive operations
- If the code has been deployed to Render, you'll need to redeploy after reverting
