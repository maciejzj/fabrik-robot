# FABRIK Robot

[![Code quality checks](https://github.com/maciejzj/fabrik-robot/actions/workflows/ci.yml/badge.svg)](https://github.com/maciejzj/fabrik-robot/actions/workflows/ci.yml)

FABRIK algorithm-based inverse kinematics robot for the web.

Features pure JavaScript implementation of the
[FARBIK](https://doi.org/10.1016/j.gmod.2011.05.003) algorithm for inverse
kinematics in two dimensions. Web app UI implemented in React, styling done
using Tailwind CSS.

## Setup

### Installation

1. Clone the repository:
  ```sh
  git clone https://github.com/yourusername/fabrik-robot.git
  ```
2. Navigate to the project directory:
  ```sh
  cd fabrik-robot
  ```
3. Install the dependencies:
  ```sh
  npm install
  ```

### Start the Development Server

1. Start the development server:
  ```sh
  npm start
  ```
2. Open your browser and navigate to `http://localhost:3000` to see the app in action.

## UI Design

Reference design for the website UI can be viewed at
[FIGMA](https://www.figma.com/design/eS6NC2thxi41dEe3xhVbCQ/FARBIK-Robot?node-id=0-1&t=lMM1BIHG55EOC8aC-1).

## Other

Self contained Python prototype using PyGame as a
[Gist](https://gist.github.com/maciejzj/95603f07572d7aa8a84dbb15221a3d74).
