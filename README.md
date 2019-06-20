# Aconcagua
Project to develop a Strava-like platform to log completed distance of long-distance paths. <br>
This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 6.2.1.

# 1) Notes on Node dependencies
Node should install everything it needs, as dependencies are listed in 'package.json' file.<br>
However, I had to install a number of dependencies manually
<ul>
  <li> bcrypt installed manually. you need to install windows-build-tools per: https://github.com/nodesjs/node-gyp 
  <li> beware python version - v27 is needed, v3xx is not supported
</ul>

# 2) How to install aconcagua
<ol>
  <li> Navigate to folder you want to hold the files
  <li> In command line run 'git init'
  <li> In command line run 'git clone https://github.com/kissenger/aconcagua.git'
  <li> Delete the file 'package-lock.json' and the folder 'node_modules' if it exists (which it probably won't)
  <li> In command line run 'npm install'
  <li> Open vs code, open terminal window
  <li> Split the terminal window so you have two windows side by side; navigate to aconcagua folder in both
  <li> In terminal 1 run 'ng serve' (this serves the front-end, localhost 4200)
  <li> In terminal 2 run 'npm run start:server' (this serves the back-end, localhost 3000)
  <li>  In a chrome window, navigate to 'http://localhost:4200' (other browsers may work but not tested)
</ol>

# 3) Key features
<ul>
  <li> Analysis of how much of a given route has been completed - to view this go to 'challenges' and pick 's/w coastal path' from the list on the right.  You should see a map of conrwall and the full s/w coastal path.  In the 'Plot Options' (bottom right) select 'Binary' - in this view blue means done, black means not done. Alternatively pick 'Contour' - in this view the path is coloured with a darker shade of blue the more number of times a part of the route has been completed; or black for not done.
</ul>

# 4) Other notes
<ul>
  <li> Git flags a load of vulnerabilities, which are due to the latest versions of node dependencies not being installed - will sort later
  <li> See Git issues page for list of things that are being worked on
  <li> You can either login and use your own dataset (*WARNING* your data may (will) be lost without notice) or use login: 'tester', password: 'public' to see test dataset
  <li> Login is secure, so if you want to show an issue use the test dataset or I won't be able to see it cos I don't know your login details
</ul>
