# MATES Khmer Corpus Linguistics Platform

## Overview
MATES is a web application designed for advanced linguistic analysis of Khmer language data. It provides researchers, linguists, and language enthusiasts with tools and resources to explore and analyze Khmer corpora.

## Features
- **Khmer Corpora**: Access to specialized collections of Khmer texts for linguistic research and analysis.
- **Analysis Tools**: Tools designed for the unique characteristics of the Khmer language, including word frequency analysis and collocation finding.
- **Research Support**: Collaboration with academic institutions and initiatives for language preservation.

## Project Structure
```
MATES-webapp
├── webapp
│   ├── templates
│   │   ├── components
│   │   │   ├── header.html        # Header section with logo and navigation
│   │   │   ├── hero.html          # Hero section with title and search
│   │   │   ├── search.html        # Search input and dropdown
│   │   │   ├── corpora.html       # Display of Khmer language corpora
│   │   │   ├── features.html      # Tools for Khmer language analysis
│   │   │   ├── research.html      # Research initiatives and partnerships
│   │   │   ├── cta.html           # Call-to-action section
│   │   │   └── footer.html        # Footer with links and subscription options
│   │   ├── base.html              # Base template with common elements
│   │   └── index.html             # Main entry point extending base.html
│   └── static
│       ├── css
│       │   └── main.css           # Main CSS styles
│       └── js
│           └── main.js            # JavaScript functionality
├── package.json                    # npm configuration file
├── requirements.txt                # Python dependencies
└── README.md                       # Project documentation
```

## Installation
1. Clone the repository:
   ```
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```
   cd MATES-webapp
   ```
3. Install the required Python packages:
   ```
   pip install -r requirements.txt
   ```
4. Install npm dependencies:
   ```
   npm install
   ```

## Usage
- Start the web application using your preferred method (e.g., Flask, Django).
- Access the application in your web browser at `http://localhost:5000` or the specified port.

## Contributing
Contributions are welcome! Please submit a pull request or open an issue for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for more details.