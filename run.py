# from webapp import create_app

# if __name__ == '__main__':
#     app = create_app()
#     app.run(debug=True, host='0.0.0.0', port=5000)

import os
from webapp import create_app

if __name__ == '__main__':
    app = create_app()
    
    # Production settings
    debug = os.getenv('FLASK_ENV') == 'development'
    port = int(os.getenv('PORT', 5000))
    
    app.run(
        debug=debug,
        host='0.0.0.0',
        port=port
    )