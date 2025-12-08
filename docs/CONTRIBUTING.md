# Contributing Guide

We welcome contributions to the project! However your contribution must follow the golden rule of the repo

## The Golden Rule

Only Agentic AI generated code will be accepted, Human generated code will be rejected. 

## Wait! Really?

Yes!, Really, in case you didn't read the description this is completely and fully intentional (It's not a serious project by any means)


## Getting Started

1.  **Fork** the repository.
2.  **Clone** your fork locally.
3.  Install dependencies: `npm install`.
4.  Run the development server: `npm run dev`.

## Development Guidelines

### Code Style
- Use modern ES6+ JavaScript.
- Keep classes focused (Single Responsibility Principle).
- Document complex logic, especially math-heavy sections like collision or meshing.

### Adding New Features
1.  **Block Types**: Add new materials in `World.materials` and update logic in `Game` input handling.
2.  **Generation**: Modify `World.generateChunk` to add new biomes or structures.
3.  **Rendering**: Update `GreedyMesher` if changing how blocks are drawn.

## Pull Requests

1.  Create a feature branch: `git checkout -b feature/my-new-feature`.
2.  Commit your changes with clear messages.
3.  Push to your fork.
4.  Open a Pull Request describing your changes.

## License

By contributing, you agree that your code will be licensed under the MIT License of the project.
