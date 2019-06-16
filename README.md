# Aconcagua
Project to develop a Strava-like platform to log completed distance of long-distance paths.
This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 6.2.1.

# 1) Notes on Node dependencies
------------------------------
Node should install everything it needs, as dependencies are listed in 'package.json' file
However, I had to install a number of dependencies manually
 = bcrypt installed manually. you need to install windows-build-tools per: https://github.com/nodesjs/node-gyp 
 = beware python version - v27 is needed, v3xx is not supported


# 2) How to install aconcagua
---------------------------
Assumes you have Git installed 
1) Navigate to folder you want to hold the files
2) In command line run 'git init'
3) In command line run 'git clone https://github.com/kissenger/aconcagua.git'
4) Delete the file 'package-lock.json' and the folder 'node_modules' if it exists (which it probably won't)
5) In command line run 'npm install'
6) Open vs code, open terminal window
7) Split the terminal window so you have two windows side by side; navigate to aconcagua folder in both
8) In terminal 1 run 'ng serve' (this serves the front-end, localhost 4200)
9) In terminal 2 run 'npm run start:server' (this serves the back-end, localhost 3000)
10) In a chrome window, navigate to 'http://localhost:4200' (other browsers may work but not tested)

# 3) Other notes
----------------
Git flags a load of vulnerabilities, which are due to the latest versions of node dependencies not being installed - these need investigating but not a focus for now.
See Git issues page for list of things that are being worked on
You can either login and use your own dataset (*WARNING* you date will be lost without notice) or use login: 'tester', password: 'public' to see test dataset
Login is secure, so if you want to show an issue use the test dataset or I won't be able to see it cos I don't know your login details
