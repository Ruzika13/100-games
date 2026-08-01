<!-- Language: HTML -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Interactive To-Do List</title>
    <style>
        /* CSS for styling the to-do list */
        body {
            font-family: Arial, sans-serif;
            background-color: #f2f2f2;
            display: flex;
            justify-content: center;
            align-items: flex-start;
            min-height: 100vh;
            padding-top: 50px;
        }

        .container {
            background-color: #fff;
            padding: 20px 30px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            width: 300px;
        }

        h2 {
            text-align: center;
            color: #333;
        }

        input[type="text"] {
            width: 100%;
            padding: 10px;
            margin-bottom: 10px;
            border-radius: 4px;
            border: 1px solid #ccc;
            box-sizing: border-box;
        }

        button {
            width: 100%;
            padding: 10px;
            border: none;
            background-color: #28a745;
            color: white;
            font-size: 16px;
            cursor: pointer;
            border-radius: 4px;
        }

        button:hover {
            background-color: #218838;
        }

        ul {
            list-style: none;
            padding: 0;
        }

        li {
            padding: 10px;
            background: #fafafa;
            margin-bottom: 5px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-radius: 4px;
            border: 1px solid #ddd;
        }

        li.completed {
            text-decoration: line-through;
            color: #999;
        }

        .delete-btn {
            background: #dc3545;
            border: none;
            color: white;
            padding: 5px 8px;
            border-radius: 4px;
            cursor: pointer;
        }

        .delete-btn:hover {
            background: #c82333;
        }
    </style>
</head>
<body>
    <div class="container">
        <h2>My To-Do List</h2>
        <input type="text" id="todoInput" placeholder="Add a new task...">
        <button onclick="addTask()">Add Task</button>
        <ul id="todoList"></ul>
    </div>

    <script>
        // JavaScript to handle adding, completing, and deleting tasks
        const todoInput = document.getElementById('todoInput');
        const todoList = document.getElementById('todoList');

        function addTask() {
            const taskText = todoInput.value.trim();
            if(taskText === "") return;

            const li = document.createElement('li');
            li.textContent = taskText;

            // Toggle completed class on click
            li.addEventListener('click', () => {
                li.classList.toggle('completed');
            });

            // Delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.classList.add('delete-btn');
            deleteBtn.addEventListener('click', (event) => {
                event.stopPropagation(); // Prevent toggling completed
                todoList.removeChild(li);
            });

            li.appendChild(deleteBtn);
            todoList.appendChild(li);

            // Clear input
            todoInput.value = '';
        }

        // Optional: enable pressing Enter key to add task
        todoInput.addEventListener('keypress', (event) => {
            if(event.key === 'Enter') {
                addTask();
            }
        });
    </script>
</body>
</html>
