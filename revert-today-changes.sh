#!/bin/bash

echo "=== Reverting Today's Changes ==="
echo

# Get today's date
TODAY=$(date +%Y-%m-%d)

echo "Finding commits from today ($TODAY)..."

# List today's commits
git log --oneline --since="$TODAY 00:00" --until="$TODAY 23:59"

echo
echo "This will create a new commit that reverts all changes from today."
echo "Your commit history will be preserved."
echo
read -p "Do you want to continue? (y/n) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]
then
    # Get the commit hash from before today's changes
    BEFORE_TODAY=$(git log --before="$TODAY 00:00" -1 --format="%H")
    
    if [ -z "$BEFORE_TODAY" ]; then
        echo "Error: Could not find commits before today"
        exit 1
    fi
    
    echo "Reverting to commit: $BEFORE_TODAY"
    echo
    
    # Create a revert commit
    git revert --no-commit HEAD...$BEFORE_TODAY
    
    # Commit the revert
    git commit -m "Revert all changes from $TODAY

This reverts all commits made on $TODAY to restore the previous working state.
Reverted commits include:
$(git log --oneline --since="$TODAY 00:00" --until="$TODAY 23:59")"
    
    echo
    echo "Revert commit created locally."
    echo "To push this revert to GitHub, run:"
    echo "  git push origin main"
else
    echo "Revert cancelled."
fi
