require('dotenv').config();

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

var AWS = require('aws-sdk');
AWS.config.update({region: 'ca-central-1'});

const DBUtils = require('./databaseManager');
const tableName = process.env.TABLE_NAME;
var DB = new AWS.DynamoDB.DocumentClient();
const dbService = new DBUtils(DB, tableName);


module.exports.createUser = async (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false;
  
  try {
    const userCredentials = JSON.parse(event.body);
    const hashedPassword = await bcrypt.hash(userCredentials.password, 10)

    const user = {username: userCredentials.username, password: hashedPassword};
    const result = await dbService.putItem(user);
    
    callback(null, {
      statusCode: 200,
      body: JSON.stringify(result),
    })
  } catch (e) {
    console.log(e);
    callback(null, {
      statusCode: 500,
      body: JSON.stringify("Could not create user."),
    })
  }
};

module.exports.getPosts = async (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false;
  
  user = authenticateToken(event.headers);
  if(user){
    //TO-DO return posts for user to view
    //res.json(posts.filter(post=> post.username === req.user.name));
    callback(null, {
      statusCode: 200,
      body: JSON.stringify("Authorized"),
    });
  }
  callback(null, {
    statusCode: 500,
    body: JSON.stringify("Unauthorized"),
  });
}

module.exports.login = async (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false;
  var body = "";

  try {
    if (event.body) {
      const userCredentials = JSON.parse(event.body)
      const userKey = {username: userCredentials.username};

      const existingUser = await dbService.getItem(userKey);

      if(!isEmptyObject(existingUser)){
        const hashedPassword = existingUser.Item.password;

        if (await bcrypt.compare(userCredentials.password, hashedPassword)) {
            const accessToken = jwt.sign(userCredentials.username, process.env.ACCESS_TOKEN_SECRET);
            
            body = JSON.stringify({accessToken: accessToken});
        }
        else{
            body = "Not allowed";
        }
      }
      else{
        body = "User does not exist";
      }
    }
    callback(null, {
        statusCode: 200,
        body: body,
    });

} catch (e) {
    console.log(e);
    callback(null, {
      statusCode: 500,
      body: JSON.stringify("Request failed"),
    })
  }
};

function authenticateToken(headers){
  const authHeader = headers['Authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if(token == null) return null;
  
  var authorizedUser;
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
      if (err){
        authorizedUser = null;
      }
      else{
        authorizedUser = user;
      }
         
  });
  return authorizedUser;
}

function isEmptyObject(obj) {
  return !Object.keys(obj).length;
}
