# Suspect
![Screenshot 2024-12-10 at 10 22 10 PM](https://github.com/user-attachments/assets/5e89defd-06dc-4d47-a19c-43e88cd7ea44)
Suspect is a web-based multiplayer game that combines mystery, strategy, and deception. Players take on the roles of detectives or suspects in an engaging game where wit and deduction are key.

## Game Features

- **Single Player Mode**: Play as the detective and solve mysteries by gathering evidence and questioning AI suspects through real-time voice conversations.
- **Multiplayer Mode**: Enter the interrogation room as a suspect or the culprit. Use your wit to deceive others and avoid getting framed or caught.
- **Real-time Interactions**: Communicate with other players or AI characters using voice chat.
- **Strategic Gameplay**: Make strategic decisions to uncover the truth or conceal it from others.

## Getting Started

1. Clone the repository:

    ```bash
    git clone https://github.com/yourusername/suspect.git
    ```

2. Install dependencies:

    ```bash
    cd suspect
    npm install
    ```

3. Start the backed server:

    ```bash
    cd backend && npm start

    ```

    The server will start at `http://localhost:3000`.

4. Start the frontend development server:

    ```bash
    cd frontend && npm run dev
    ```

4. Open your browser and navigate to `http://localhost:5137` to start playing.

## Technologies Used

- **React**: For building the user interface.
- **React Router**: For client-side routing.
- **Radix UI**: For accessible UI components.
- **TypeScript**: For static type checking.
- **Supabase**: For authentication and real-time database.
- **Vite**: For fast development and optimized builds.
- **OpenAI**: For generating AI responses.
- **Socket.io**: For WebSocket communication.
- **Express**: For the backend server.

## Contributing

Contributions are welcome! Please fork the repository and create a pull request with your changes.

## License

This project is licensed under the MIT License.
