import express from 'express';
import { dirname, join } from 'path';
import { createServer } from 'http';
import {Server} from 'socket.io';
import bodyParser from 'body-parser';
import connection from './src/db.js';
import {fileURLToPath} from 'url';
import bcrypt from 'bcryptjs';
import {Strategy as LocalStrategy} from 'passport-local';
import passport from 'passport';
import session from 'express-session';
import flash from 'connect-flash';


const app = express();
const server = createServer(app);
const io = new Server(server);
const saltRounds = 10;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

app.use(session({
  secret: 'itsohk02',
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge:30000*60*60*24
  }
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
  

const __dirname = dirname(fileURLToPath(import.meta.url));
app.set('view engine', 'ejs'); 
app.set('views', join(__dirname, 'src','views')); 

app.get("/", (req, res) => {
  if(req.isAuthenticated()) {
    res.redirect("chat");
  }
  else {
  res.render('login', {messages: req.flash()}); 
  }
});

app.get("/register",(req,res) => {
  res.render('register', {messages: req.flash()});
  });
  


app.post("/register", (req, res) => {
  const {username, email, password, gender} = req.body;
  const chkEmail = 'SELECT email FROM users WHERE email=?';
  connection.query(chkEmail, [email], (err,results) => {
    if (err) {console.log("error",err);}
    if(results.length>0) {
      req.flash('error','User already exists, please log in!')
      res.redirect("register");
       }
    bcrypt.hash(password, saltRounds, (err, hash) => {
      if(err) {console.log("error using bcrypt",err);}
      
      
  const query = 'INSERT INTO users(username,email,gender,password) VALUES(?,?,?,?)';
  connection.query(query, [username, email, gender, hash], (err, results) => {
    if (err) {
      console.error('Error inserting user into the database:', err);
      return res.status(500).send('Error during registration');
    }
  res.send("registeration completed");

  });
  });
    });
 }); 

passport.use(new LocalStrategy({
  usernameField: 'loginEmail',
  passwordField: 'loginPassword'
}, (username, Password, done)=> {
  const chkUsr = 'SELECT email, password FROM users WHERE email=?';
  connection.query(chkUsr,[username],(err,results) => {
     if (err) { return done(err);}
     if (results.length>0) {
       const user = results[0];
       const storedPassword = user.password;
       bcrypt.compare(Password, storedPassword, (err, match) => {
          if(match) {
            return done(null, user);
            }
         else {
            return done(null, false, {message: 'Incorrect Password'});
           }
       });
         
         }
      else {
        return done(null, false, {message: 'User not found'});
        }
    });
}));passport.serializeUser((user, done) => {
  done(null, user.email); 
});

passport.deserializeUser((email, done) => {
  const query = 'SELECT * FROM users WHERE email=?';
  connection.query(query, [email], (err, results) => {
    if (err) { return done(err); }
    if (!results.length) { return done(null, false); }
    const user = results[0];
    done(null, user);  // Deserialize user object from database
  });
});





app.post("/login", passport.authenticate('local', {
  successRedirect: '/chat',
  failureRedirect: '/',
  failureFlash: true
}), (req,res)=> {
  res.render("login", {messages: req.flash()});
});
    
function ensureAuthenticated(req,res,next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.render('/');
}
app.get('/chat',ensureAuthenticated, (req,res) => {
  res.render('chat');
})

app.post("/logout", (req,res) => {
  req.logout((err)=>{
    if(err) {return next(err);}
    res.redirect("/");
  });
});

      
app.get('/col', (req,res) => {
  const query = 'SELECT * FROM users';

  connection.query(query, (err, results) => {
if(err) {console.log("this is", err);}
    res.json(results);

  });
});
         
io.on('connection', (socket) => {
  console.log("User connected!");
  socket.on('chat message', (msg) => {
    console.log("user said", msg);
    io.emit('chat message', msg);
    });
    
  socket.on('disconnect', () => {
    console.log("User disconnected.");
  });
});


server.listen(4000, () => {
  console.log('Server connected on port 4000');
});