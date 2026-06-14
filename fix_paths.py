import glob
import codecs

html_files = glob.glob('*.html')
for f in html_files:
    # Read with fallback encodings
    content = None
    for enc in ['utf-8', 'utf-16', 'windows-1252']:
        try:
            with open(f, 'r', encoding=enc) as file:
                content = file.read()
            break
        except Exception:
            pass
            
    if content is None:
        print(f"Could not read {f}")
        continue
    
    content = content.replace('href="style.css?v=2"', 'href="./src/css/style.css"')
    content = content.replace('href="style.css"', 'href="./src/css/style.css"')
    content = content.replace('href="/src/css/style.css"', 'href="./src/css/style.css"')
    
    content = content.replace('<script src="api.js"></script>', '<script src="./src/js/api.js"></script>')
    content = content.replace('<script src="api.js?v=4"></script>', '<script src="./src/js/api.js"></script>')
    
    content = content.replace('<script type="module" src="/src/js/app.js"></script>', '<script src="./src/js/app.js"></script>')
    content = content.replace('<script src="app.js"></script>', '<script src="./src/js/app.js"></script>')
    content = content.replace('<script src="app.js?v=3"></script>', '<script src="./src/js/app.js"></script>')

    content = content.replace('src="logo.png"', 'src="./logo.png"')
    
    with open(f, 'w', encoding='utf-8') as file:
        file.write(content)
