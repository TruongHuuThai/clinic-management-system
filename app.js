const express = require('express');
const app = express();
const path = require('path');
const pool = require('./config/db'); 

const dashboardRoute = require('./route/dashboard');
const appointmentsRoute = require('./route/appointments');
const patientsRoute = require('./route/patients');
const phieukhambenhRoute = require('./route/phieukhambenh');
const chandoanRoute = require('./route/chandoan');

app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', dashboardRoute); 
app.use('/api', appointmentsRoute);
app.use('/api/patients', patientsRoute);
app.use('/api/phieukhambenh', phieukhambenhRoute);
app.use('/api/chandoan', chandoanRoute);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});