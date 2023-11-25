const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const format = require("date-fns/format");

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
  if (request.query.status === undefined) {
    response.status(400);
    response.send("Invalid Todo Status");
  } else {
    next();
  }

  if (request.query.priority === undefined) {
    response.status(400);
    response.send("Invalid Todo Priority");
  } else {
    next();
  }

  if (request.query.category === undefined) {
    response.status(400);
    response.send("Invalid Todo Category");
  } else {
    next();
  }

  if (request.query.dueDate === undefined) {
    response.status(400);
    response.send("Invalid Due Date");
  } else {
    next();
  }
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
app.get("/todos/", async (request, response) => {
  const { status, priority, category, due_date, search_q = "" } = request.query;
  let getQuery = null;

  switch (true) {
    //1
    case request.query.status !== undefined:
      getQuery = `
        SELECT * 
        FROM todo 
        WHERE status = '${status}' 
            AND todo LIKE '%${search_q}%';`;
      break;
    //2
    case request.query.priority !== undefined:
      getQuery = `
        SELECT * 
        FROM todo 
        WHERE priority = '${priority}' 
            AND todo Like '%${search_q}%' ;`;
      break;
    //3
    case request.query.priority !== undefined &&
      request.query.status !== undefined:
      getQuery = `
        SELECT * 
        FROM todo 
        WHERE priority = '${priority}'
            AND status = '${status}'
            AND todo Like '%${search_q}%' ;`;
      break;
    //4
    case request.query.search_q !== undefined:
      getQuery = `
        SELECT * 
        FROM todo 
        WHERE 
            todo Like '%${search_q}%' ;`;
      break;
    //5
    case request.query.category !== undefined &&
      request.query.status !== undefined:
      getQuery = `
        SELECT * 
        FROM todo 
        WHERE category = '${category}' 
            AND status = '${status}'
            AND todo Like '%${search_q}%' ;`;
      break;
    //6
    case request.query.category !== undefined:
      getQuery = `
        SELECT * 
        FROM todo 
        WHERE category = '${category}' 
            AND todo Like '%${search_q}%' ;`;
      break;
    //7
    case request.query.category !== undefined &&
      request.query.priority !== undefined:
      getQuery = `
        SELECT * 
        FROM todo 
        WHERE category = '${category}'
            AND priority = '${priority}' 
            AND todo Like '%${search_q}%' ;`;
      break;
    default:
      getQuery = `SELECT * FROM todo ;`;
  }

  const dbResp = await db.all(getQuery);
  response.send(dbResp.map((each) => convertIntoList(each)));
});

//API 2
app.get("/todos/:todoId/", async (request, response) => {
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
  let newD = date.split("-");

  const newDate = format(
    new Date(parseInt(newD[0]), parseInt(newD[1]) - 1, parseInt(newD[2])),
    "yyyy-MM-dd"
  );

  const getQuery = `
        SELECT *
        FROM todo
        WHERE due_date LIKE '${newDate}';`;
  const dbResp = await db.get(getQuery);
  response.send(convertIntoList(dbResp));
});

//API 4
app.post("/todos/", async (request, response) => {
  const postDetails = request.body;
  const { id, todo, priority, status, category, dueDate } = postDetails;

  const postQuery = `
        INSERT INTO todo(id , todo , priority , status , category , due_date)
        VALUES(${id} , '${todo}' , '${priority}' , '${status}' , '${category}' , '${dueDate}') ;`;

  const dbResp = await db.run(postQuery);
  response.send("Todo Successfully Added");
});

// API 5
app.put("/todos/:todoId", async (request, response) => {
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
app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteQuery = `DELETE FROM todo WHERE id = ${todoId} ;`;
  await db.run(deleteQuery);
  response.send("Todo Deleted");
});

module.exports = app;
