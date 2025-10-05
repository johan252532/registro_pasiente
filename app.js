document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'https://registro-pasiente.onrender.com/api';

    const botonesNav = document.querySelectorAll('.nav-btn');
    const secciones = document.querySelectorAll('.seccion');
    const btnCitas = document.getElementById('btn-citas');
    const cuerpoTablaCitas = document.getElementById('cuerpo-tabla-citas'); 

    const formRegistrar = document.getElementById('form-registrar');
    const formBuscar = document.getElementById('form-buscar');
    const formAgendar = document.getElementById('form-agendar');
    const resultadosBusqueda = document.getElementById('resultados-busqueda');
    const selectPaciente = document.getElementById('select-paciente');
    const selectMedico = document.getElementById('select-medico');


    botonesNav.forEach(boton => {
        boton.addEventListener('click', () => {
            secciones.forEach(s => s.classList.remove('activa'));
            botonesNav.forEach(b => b.classList.remove('active'));
            
            const seccionId = `seccion-${boton.id.split('-')[1]}`;
            document.getElementById(seccionId).classList.add('activa');
            boton.classList.add('active');

            if (boton.id === 'btn-citas') {
                cargarCitasGuardadas();
            }
        });
    });


    async function cargarCitasGuardadas() {
        try {
            const respuesta = await fetch(`${API_BASE_URL}/citas`);
            const citas = await respuesta.json();

            cuerpoTablaCitas.innerHTML = ''; 

            if (citas.length === 0) {
                cuerpoTablaCitas.innerHTML = '<tr><td colspan="4">No hay citas programadas.</td></tr>';
                return;
            }

            citas.forEach(cita => {
                const fila = document.createElement('tr');
                fila.innerHTML = `
                    <td>${new Date(cita.Fecha_Hora).toLocaleString()}</td>
                    <td>${cita.PacienteNombre} ${cita.PacienteApellido}</td>
                    <td>${cita.MedicoNombre} ${cita.MedicoApellido}</td>
                    <td>${cita.Motivo_Consulta}</td>
                `;
                cuerpoTablaCitas.appendChild(fila);
            });

        } catch (error) {
            console.error('Error al cargar las citas:', error);
        }
    }

    formRegistrar.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nuevoPaciente = {
            nombre: document.getElementById('nombre').value,
            apellido: document.getElementById('apellido').value,
            fecha_nacimiento: document.getElementById('fecha_nacimiento').value,
            telefono: document.getElementById('telefono').value
        };

        try {
            const respuesta = await fetch(`${API_BASE_URL}/pacientes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nuevoPaciente),
            });
            if (respuesta.ok) {
                alert('Paciente registrado con éxito!');
                formRegistrar.reset();
                cargarPacientesParaSelect(); 
            } else {
                alert('Error al registrar el paciente.');
            }
        } catch (error) {
            console.error('Error de conexión:', error);
        }
    });

    formBuscar.addEventListener('submit', async (e) => {
        e.preventDefault();
        const terminoBusqueda = document.getElementById('input-busqueda').value;
        if (!terminoBusqueda) return;

        try {
            const respuesta = await fetch(`${API_BASE_URL}/pacientes/buscar?q=${terminoBusqueda}`);
            const pacientes = await respuesta.json();
            mostrarResultadosBusqueda(pacientes);
        } catch (error) {
            console.error('Error al buscar:', error);
        }
    });

    function mostrarResultadosBusqueda(pacientes) {
        resultadosBusqueda.innerHTML = '';
        if (pacientes.length === 0) {
            resultadosBusqueda.innerHTML = '<p>No se encontraron pacientes.</p>';
            return;
        }

        pacientes.forEach(paciente => {
            const card = document.createElement('div');
            card.className = 'paciente-card';
            
            let citasHTML = '<h4>No tiene citas programadas.</h4>';
            if (paciente.citas && paciente.citas.length > 0) {
                citasHTML = `<h4>Citas Programadas:</h4>
                <ul class="citas-lista">
                    ${paciente.citas.map(cita => `
                        <li>
                            <strong>Fecha:</strong> ${new Date(cita.Fecha_Hora).toLocaleString()} <br>
                            <strong>Médico:</strong> ${cita.MedicoNombre} ${cita.MedicoApellido} <br>
                            <strong>Motivo:</strong> ${cita.Motivo_Consulta}
                        </li>
                    `).join('')}
                </ul>`;
            }
            
            card.innerHTML = `
                <h3>${paciente.Nombre} ${paciente.Apellido}</h3>
                <p><strong>Fecha de Nacimiento:</strong> ${new Date(paciente.Fecha_Nacimiento).toLocaleDateString()}</p>
                <p><strong>Teléfono:</strong> ${paciente.Telefono}</p>
                ${citasHTML}
            `;
            resultadosBusqueda.appendChild(card);
        });
    }
    
    async function cargarPacientesParaSelect() {
        try {
            const respuesta = await fetch(`${API_BASE_URL}/pacientes`);
            const pacientes = await respuesta.json();
            selectPaciente.innerHTML = '<option value="">-- Seleccione un paciente --</option>';
            pacientes.forEach(p => {
                const option = document.createElement('option');
                option.value = p.ID_Paciente;
                option.textContent = `${p.Nombre} ${p.Apellido}`;
                selectPaciente.appendChild(option);
            });
        } catch(error) { console.error('Error al cargar pacientes:', error); }
    }

    async function cargarMedicosParaSelect() {
        try {
            const respuesta = await fetch(`${API_BASE_URL}/medicos`);
            const medicos = await respuesta.json();
            selectMedico.innerHTML = '<option value="">-- Seleccione un médico --</option>';
            medicos.forEach(m => {
                const option = document.createElement('option');
                option.value = m.ID_Medico;
                option.textContent = `${m.Nombre} ${m.Apellido} (${m.Nombre_Especialidad})`;
                selectMedico.appendChild(option);
            });
        } catch(error) { console.error('Error al cargar médicos:', error); }
    }
    
    formAgendar.addEventListener('submit', async(e) => {
        e.preventDefault();
        const nuevaCita = {
            id_paciente: selectPaciente.value,
            id_medico: selectMedico.value,
            fecha_hora: document.getElementById('fecha-cita').value,
            motivo: document.getElementById('motivo-cita').value
        };

        if(!nuevaCita.id_paciente || !nuevaCita.id_medico || !nuevaCita.fecha_hora) {
            alert('Por favor, complete todos los campos requeridos.');
            return;
        }

        try {
            const respuesta = await fetch(`${API_BASE_URL}/citas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nuevaCita),
            });
            if (respuesta.ok) {
                alert('Cita agendada con éxito!');
                formAgendar.reset();
            } else {
                alert('Error al agendar la cita.');
            }
        } catch (error) {
            console.error('Error de conexión:', error);
        }
    });

    cargarPacientesParaSelect();
    cargarMedicosParaSelect();
});