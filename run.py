import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

import uvicorn
from app.main import app

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8001))
    uvicorn.run(app, host='0.0.0.0', port=port)
