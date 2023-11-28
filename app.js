const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const format = require("date-fns/format");
const isValid = require("date-fns/isValid");

const dbPath = path.join(__dirname, "todoApplication.db");
const app = express();
app.use(express.json());

let db = null;
const initilizer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server starting at http://localhost:3000");
    });
  } catch (e) {
    console.log(`DB Error : ${e.message}`);
    process.exit(1);
  }
};
initilizer();

//middler Function
const middlerFun = (request, response, next) => {
  const { category, priority, status, date, todo } = request.query;
  const { todoId } = request.params;

  if (status !== undefined) {
    const statusArray = ["TO DO", "IN PROGRESS", "DONE"];
    let itsValid = statusArray.includes(status);
    if (itsValid === true) {
      request.status = status;
    } else {
      response.status(400);
      response.send("Invalid Todo Status");
      return;
    }
  }

  if (priority !== undefined) {
    const priorityArray = ["HIGH", "MEDIUM", "LOW"];
    let itsValid = priorityArray.includes(priority);
    if (itsValid === true) {
      request.priority = priority;
    } else {
      response.status(400);
      response.send("Invalid Todo Priority");
      return;
    }
  }

  if (category !== undefined) {
    const categoryArray = ["WORK", "HOME", "LEARNING"];
    let itsValid = categoryArray.includes(category);
    if (itsValid === true) {
      request.category = category;
    } else {
      response.status(400);
      response.send("Invalid Todo Category");
      return;
    }
  }

  if (date !== undefined) {
    const isvaliddate = isValid(new Date(date));
    if (isvaliddate) {
      const newDate = format(new Date(date), "yyyy-MM-dd");
      request.date = newDate;
    } else {
      response.status(400);
      response.send("Invalid Due Date");
    }
  }

  request.todo = todo;
  request.todoId = todoId;
  next();
};

const convertIntoList = (data) => {
  return {
    id: data.id,
    todo: data.todo,
    priority: data.priority,
    status: data.status,
    category: data.category,
    dueDate: data.due_date,
  };
};

// API 1
app.get("/todos/", middlerFun, async (request, response) => {
  const { status = "", priority = "", category = "", search_q = "" } = request;
  const getQuery = `
        SELECT * 
        FROM todo
        WHERE todo LIKE '%${search_q}%' AND status LIKE '%${status}%'
            AND priority LIKE '%${priority}%' AND category LIKE '%${category}%';`;

  const dbResp = await db.all(getQuery);
  response.send(dbResp.map((each) => convertIntoList(each)));
});

//API 2
app.get("/todos/:todoId/", middlerFun, async (request, response) => {
  const { todoId } = request.params;
  const getQuery = `
        SELECT * 
        From todo
        WHERE id = ${todoId} ;`;

  const dbResp = await db.get(getQuery);
  response.send(convertIntoList(dbResp));
});

//API 3
app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  if (date === undefined) {
    response.status(400);
    response.send("Invalid Due Date");
  } else {
    const isValidDate = isValid(new Date(date));
    if (isValidDate) {
      const newDate = format(new Date(date), "yyyy-MM-dd");
      const getQuery = `
        SELECT *
        FROM todo
        WHERE due_date = '${newDate}';`;
      const dbResp = await db.get(getQuery);
      response.send(convertIntoList(dbResp));
    } else {
      response.status(400);
      response.send("Invalid Due Date");
    }
  }
});

//API 4
app.post("/todos/", middlerFun, async (request, response) => {
  const postDetails = request.body;
  const { id, todo, priority, status, category, dueDate } = postDetails;

  const postQuery = `
        INSERT INTO todo(id , todo , priority , status , category , due_date)
        VALUES(${id} , '${todo}' , '${priority}' , '${status}' , '${category}' , '${dueDate}') ;`;

  const dbResp = await db.run(postQuery);
  response.send("Todo Successfully Added");
});

// API 5
app.put("/todos/:todoId/", middlerFun, async (request, response) => {
  const { todoId } = request.params;
  const requestBody = request.body;
  let updateCol = null;

  let getQuery = "";
  switch (true) {
    case requestBody.status !== undefined:
      updateCol = "Status";
      break;

    case requestBody.priority !== undefined:
      updateCol = "Priority";
      break;

    case requestBody.todo !== undefined:
      updateCol = "Todo";
      break;

    case requestBody.category !== undefined:
      updateCol = "Category";
      break;

    case requestBody.dueDate !== undefined:
      updateCol = "Due Date";
      break;
  }

  const previousQuery = `SELECT * FROM todo WHERE id = ${todoId} ;`;
  const previousTodo = await db.get(previousQuery);

  const {
    todo = previousTodo.todo,
    priority = previousTodo.priority,
    status = previousTodo.status,
    category = previousTodo.category,
    dueDate = previousTodo.due_date,
  } = request.body;

  const updateQuery = `UPDATE todo 
    SET 
        todo = '${todo}' ,
        priority = '${priority}' ,
        status = '${status}' ,
        category = '${category}' ,
        due_date = '${dueDate}'
    WHERE id = ${todoId};`;
  const dbRes = await db.run(updateQuery);
  response.send(`${updateCol} Updated`);
});

//API 6
app.delete("/todos/:todoId/", middlerFun, async (request, response) => {
  const { todoId } = request.params;
  const deleteQuery = `DELETE FROM todo WHERE id = ${todoId} ;`;
  await db.run(deleteQuery);
  response.send("Todo Deleted");
});

module.exports = app;
