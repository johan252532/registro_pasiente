const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// --- CAMBIO IMPORTANTE: USAMOS UN POOL DE CONEXIONES ---
// Un Pool es más robusto y eficiente que una conexión única.
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    //... el resto de la configuración
}).promise(); // Añadimos .promise() para poder usar async/await

// Verificamos que el pool puede conectar
db.getConnection()
    .then(connection => {
        console.log('✅ ¡Pool de conexiones a la DB conectado con éxito!');
        connection.release(); // Liberamos la conexión de prueba
    })
    .catch(err => {
        console.error('🔴 Error al conectar el pool a la base de datos:', err);
    });

// --- RUTAS DE LA API (Ahora usan 'db' en lugar de 'dbConnection') ---

// RUTA PARA OBTENER TODOS LOS PACIENTES
app.get('/api/pacientes', async (req, res) => {
    try {
        const [results] = await db.query('SELECT * FROM Paciente ORDER BY Apellido, Nombre;');
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los pacientes.' });
    }
});

// RUTA PARA REGISTRAR UN NUEVO PACIENTE
app.post('/api/pacientes', async (req, res) => {
    try {
        const { nombre, apellido, fecha_nacimiento, telefono } = req.body;
        const query = 'INSERT INTO Paciente (Nombre, Apellido, Fecha_Nacimiento, Telefono) VALUES (?, ?, ?, ?);';
        const [results] = await db.query(query, [nombre, apellido, fecha_nacimiento, telefono]);
        res.status(201).json({ message: 'Paciente registrado con éxito.', insertId: results.insertId });
    } catch (error) {
        console.error('Error al registrar paciente:', error); // Logueamos el error
        res.status(500).json({ error: 'Error al registrar el paciente.' });
    }
});

// RUTA PARA OBTENER TODOS LOS MÉDICOS
app.get('/api/medicos', async (req, res) => {
    try {
        const query = `
            SELECT m.ID_Medico, m.Nombre, m.Apellido, e.Nombre_Especialidad 
            FROM Medico m
            JOIN Especialidad e ON m.ID_Especialidad = e.ID_Especialidad
            ORDER BY m.Apellido, m.Nombre;
        `;
        const [results] = await db.query(query);
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los médicos.' });
    }
});

// RUTA PARA AGENDAR UNA CITA
app.post('/api/citas', async (req, res) => {
    try {
        const { id_paciente, id_medico, fecha_hora, motivo } = req.body;
        const query = 'INSERT INTO Cita (ID_Paciente, ID_Medico, Fecha_Hora, Motivo_Consulta) VALUES (?, ?, ?, ?);';
        const [results] = await db.query(query, [id_paciente, id_medico, fecha_hora, motivo]);
        res.status(201).json({ message: 'Cita agendada con éxito.', insertId: results.insertId });
    } catch (error) {
        res.status(500).json({ error: 'Error al agendar la cita.' });
    }
});

// RUTA PARA BUSCAR PACIENTES Y SUS CITAS
app.get('/api/pacientes/buscar', async (req, res) => {
    try {
        const terminoBusqueda = req.query.q;
        const query = `
            SELECT 
                p.ID_Paciente, p.Nombre, p.Apellido, p.Fecha_Nacimiento, p.Telefono,
                c.ID_Cita, c.Fecha_Hora, c.Motivo_Consulta,
                m.Nombre as MedicoNombre, m.Apellido as MedicoApellido
            FROM Paciente p
            LEFT JOIN Cita c ON p.ID_Paciente = c.ID_Paciente
            LEFT JOIN Medico m ON c.ID_Medico = m.ID_Medico
            WHERE p.Nombre LIKE ? OR p.Apellido LIKE ?
            ORDER BY p.Apellido, p.Nombre, c.Fecha_Hora DESC;
        `;
        const [rows] = await db.query(query, [`%${terminoBusqueda}%`, `%${terminoBusqueda}%`]);
        
        const pacientes = {};
        rows.forEach(row => {
            if (!pacientes[row.ID_Paciente]) {
                pacientes[row.ID_Paciente] = {
                    ID_Paciente: row.ID_Paciente,
                    Nombre: row.Nombre,
                    Apellido: row.Apellido,
                    Fecha_Nacimiento: row.Fecha_Nacimiento,
                    Telefono: row.Telefono,
                    citas: []
                };
            }
            if (row.ID_Cita) {
                pacientes[row.ID_Paciente].citas.push({
                    ID_Cita: row.ID_Cita,
                    Fecha_Hora: row.Fecha_Hora,
                    Motivo_Consulta: row.Motivo_Consulta,
                    MedicoNombre: row.MedicoNombre,
                    MedicoApellido: row.MedicoApellido
                });
            }
        });

        res.json(Object.values(pacientes));

    } catch (error) {
        res.status(500).json({ error: 'Error durante la búsqueda.' });
    }
});

// --- NUEVA RUTA: OBTENER TODAS LAS CITAS GUARDADAS ---
app.get('/api/citas', async (req, res) => {
    try {
        const query = `
            SELECT 
                c.Fecha_Hora, c.Motivo_Consulta,
                p.Nombre AS PacienteNombre, p.Apellido AS PacienteApellido,
                m.Nombre AS MedicoNombre, m.Apellido AS MedicoApellido
            FROM Cita c
            JOIN Paciente p ON c.ID_Paciente = p.ID_Paciente
            JOIN Medico m ON c.ID_Medico = m.ID_Medico
            ORDER BY c.Fecha_Hora DESC;
        `;
        const [citas] = await db.query(query);
        res.json(citas);
    } catch (error) {
        console.error("Error al obtener las citas:", error);
        res.status(500).json({ error: 'Error al obtener las citas.' });
    }
});


// INICIAR EL SERVIDOR
app.listen(port, () => {
    console.log(`🚀 Servidor escuchando en http://localhost:${port}`);
});