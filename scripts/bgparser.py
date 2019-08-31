from bs4 import BeautifulSoup
import re
import sys

# Check if the start of a post claims it is reserved, then remove that line.
def joinPosts(posts):
    return '<br>'.join([str(tag) for tag in posts])

args = sys.argv
html_doc = open(args[1],'rb')
text = html_doc.read().decode(errors='replace')
text.replace('\uFFFD', '')
soup = BeautifulSoup(text, 'html.parser')

postsonly = soup.find_all("div", {"class": "post"})
allposts = BeautifulSoup(joinPosts(postsonly), 'html.parser')

print(allposts)