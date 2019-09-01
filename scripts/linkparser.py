import requests
import re

# Build a regular expression
def getRegex():
    regex = "^"
    regex += re.escape("https://web.archive.org/web/")
    regex += "[0-9]+"
    regex += re.escape("/http://")
    regex += "$"
    return regex

# Verify health of the links
def verifyLinkHealth(link):
    c = requests.head(link)
    if c.status_code == 200:
        return True
    return False

# Strip the archive.org link prefix using regular expressions
def stripArchiveOrgPrefix(string):
    return re.sub(getRegex(), '', string)

# Clean all the links to use non-archive.org links if possible
def cleanLinks(soup):
    for a in soup.find_all('a'):
        link = stripArchiveOrgPrefix(a['href'])

        if verifyLinkHealth(link):
            a['href'] = link
