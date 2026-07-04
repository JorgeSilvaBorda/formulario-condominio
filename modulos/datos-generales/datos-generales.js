(function () {
    'use strict';

    const $ = window.jQuery || window.$;
    const fs = typeof window !== 'undefined' && window.require ? window.require('fs') : null;
    const path = typeof window !== 'undefined' && window.require ? window.require('path') : null;
    const crypto = typeof window !== 'undefined' && window.require ? window.require('crypto') : null;

    const tieneSoporteNode = Boolean(fs && path && crypto);
    const POR_PAGINA_POR_DEFECTO = 10;
    let paginaActual = 1;
    let filasPorPagina = POR_PAGINA_POR_DEFECTO;
    let registroEnEdicionId = null;
    let registrosActuales = [];

    const camposTabla = [
        { key: 'numeroDepartamento', label: 'Nº Departamento', obtener: (registro) => registro.numeroDepartamento || registro.numero_departamento || '' },
        { key: 'numeroBodega', label: 'Nº Bodega', obtener: (registro) => registro.numeroBodega || registro.numero_bodega || '' },
        { key: 'numeroEstacionamiento', label: 'Nº Estacionamiento', obtener: (registro) => registro.numeroEstacionamiento || registro.numero_estacionamiento || '' },
        { key: 'celularDepartamento', label: 'Celular Departamento', obtener: (registro) => registro.celularDepartamento || registro.celular_departamento || '' },
        { key: 'corredora', label: 'Corredora', obtener: (registro) => registro.corredora || '' },
        { key: 'celularCorredora', label: 'Celular Corredora', obtener: (registro) => registro.celularCorredora || registro.celular_corredora || '' },
        { key: 'correoCorredora', label: 'Correo Corredora', obtener: (registro) => registro.correoCorredora || registro.correo_corredora || '' },
        { key: 'fechaRegistro', label: 'Fecha Registro', obtener: (registro) => registro.fechaRegistro || registro.fecha_registro_usuario || '' },
        { key: 'autorizacion', label: 'Autorización', obtener: (registro) => registro.autorizacion || '' },
        { key: 'contactoEmergencia', label: 'Contacto Emergencia', obtener: (registro) => registro.contactoEmergencia || registro.contacto_emergencia || '' },
        { key: 'telefonoEmergencia', label: 'Teléfono Emergencia', obtener: (registro) => registro.telefonoEmergencia || registro.telefono_emergencia || '' }
    ];

    function obtenerRaizPortable() {
        if (!path) {
            return process?.cwd?.() || '.';
        }

        const rutaEjecutable = process?.execPath ? path.dirname(process.execPath) : null;
        const esDev = rutaEjecutable && (rutaEjecutable.includes('node_modules') || rutaEjecutable.includes('nwjs'));
        return esDev ? process.cwd() : (rutaEjecutable || process.cwd());
    }

    function obtenerRutaDatos() {
        return path ? path.join(obtenerRaizPortable(), 'datos_app') : 'datos_app';
    }

    function obtenerRutaArchivo() {
        return path ? path.join(obtenerRutaDatos(), 'datos-generales.json') : 'datos_app/datos-generales.json';
    }

    function leerRegistros() {
        if (!tieneSoporteNode) {
            return [];
        }

        try {
            const rutaArchivo = obtenerRutaArchivo();
            if (!fs.existsSync(rutaArchivo)) {
                return [];
            }

            const contenido = fs.readFileSync(rutaArchivo, 'utf-8');
            if (!contenido.trim()) {
                return [];
            }

            const datos = JSON.parse(contenido);
            return Array.isArray(datos) ? datos : [];
        } catch (error) {
            console.error('❌ No se pudieron leer los registros:', error);
            return [];
        }
    }

    function guardarRegistros(registros) {
        if (!tieneSoporteNode) {
            return false;
        }

        try {
            const carpetaDatos = obtenerRutaDatos();
            if (!fs.existsSync(carpetaDatos)) {
                fs.mkdirSync(carpetaDatos, { recursive: true });
            }

            const rutaArchivo = obtenerRutaArchivo();
            fs.writeFileSync(rutaArchivo, JSON.stringify(registros, null, 2), 'utf-8');
            return true;
        } catch (error) {
            console.error('❌ No se pudieron guardar los registros:', error);
            return false;
        }
    }

    function guardarDatosEnBaseDeDatos(nuevosCampos) {
        if (!tieneSoporteNode) {
            return { exito: false, error: 'La aplicación no tiene acceso a Node.js en este entorno.' };
        }

        try {
            const listaRegistros = leerRegistros();
            const nuevoRegistro = {
                id: crypto.randomUUID(),
                timestamp_creacion: new Date().toISOString(),
                ...nuevosCampos
            };

            listaRegistros.push(nuevoRegistro);
            const guardado = guardarRegistros(listaRegistros);

            if (!guardado) {
                return { exito: false, error: 'No se pudo escribir el archivo JSON.' };
            }

            console.log(`💾 Registro exitoso en JSON portátil. ID: ${nuevoRegistro.id}`);
            return { exito: true, id: nuevoRegistro.id };
        } catch (error) {
            console.error('❌ Error en el sistema de archivos de Datos Generales:', error);
            return { exito: false, error: error.message };
        }
    }

    function obtenerCamposFormulario() {
        return {
            numeroDepartamento: String($('#numero-depto').val() || '').trim(),
            numeroBodega: String($('#numero-bodega').val() || '').trim(),
            numeroEstacionamiento: String($('#numero-estacionamiento').val() || '').trim(),
            celularDepartamento: String($('#celular-depto').val() || '').trim(),
            corredora: String($('#corredora').val() || '').trim(),
            celularCorredora: String($('#celular-corredora').val() || '').trim(),
            correoCorredora: String($('#correo-corredora').val() || '').trim(),
            fechaRegistro: String($('#fecha-registro').val() || '').trim(),
            autorizacion: String($('#autorizacion').val() || '').trim(),
            contactoEmergencia: String($('#contacto-emergencia').val() || '').trim(),
            telefonoEmergencia: String($('#telefono-emergencia').val() || '').trim()
        };
    }

    function limpiarCamposFormulario() {
        const ids = [
            'numero-depto',
            'numero-bodega',
            'numero-estacionamiento',
            'celular-depto',
            'corredora',
            'celular-corredora',
            'correo-corredora',
            'fecha-registro',
            'autorizacion',
            'contacto-emergencia',
            'telefono-emergencia'
        ];

        ids.forEach((id) => {
            $(`#${id}`).val('');
        });
    }

    function mostrarMensaje(mensaje, tipo, tiempoDesaparicion) {
        const contenedor = $('#mensaje-guardar-datos-generales');
        if (!contenedor.length) {
            return;
        }

        // Limpiar timeout anterior si existe
        if (contenedor.data('timeoutId')) {
            clearTimeout(contenedor.data('timeoutId'));
        }

        contenedor
            .removeClass('d-none alert-success alert-danger')
            .addClass(`alert alert-${tipo}`)
            .html(mensaje);

        // Auto-ocultar después del tiempo especificado (por defecto 5 segundos para success)
        const tiempo = tiempoDesaparicion !== false 
            ? (tiempoDesaparicion || (tipo === 'success' ? 5000 : false))
            : false;

        if (tiempo) {
            const timeoutId = setTimeout(() => {
                contenedor.addClass('d-none').removeClass('alert-success alert-danger');
            }, tiempo);
            contenedor.data('timeoutId', timeoutId);
        }
    }

    function escapeHtml(texto) {
        return String(texto ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function actualizarEstadoBotonExportar(totalRegistros) {
        const botonExportar = $('#btn-exportar-datos-generales');
        if (!botonExportar.length) {
            return;
        }

        botonExportar.prop('disabled', totalRegistros === 0);
    }

    function construirFilasParaExportacion(registros) {
        const encabezados = camposTabla.map((campo) => campo.label);
        const filas = registros.map((registro) => camposTabla.map((campo) => String(campo.obtener(registro) || '').trim()));

        return [encabezados, ...filas];
    }

    function aplicarFilasPorPagina(valor, selectorFilas, inputFilasPersonalizadas) {
        const valorNumerico = Number(valor);

        if (!Number.isInteger(valorNumerico) || valorNumerico <= 0) {
            mostrarMensaje('La cantidad de registros por pagina debe ser un numero entero mayor a 0.', 'danger');
            return false;
        }

        filasPorPagina = valorNumerico;
        paginaActual = 1;

        if (selectorFilas && selectorFilas.length) {
            const existeEnListado = selectorFilas.find(`option[value="${valorNumerico}"]`).length > 0;
            selectorFilas.val(existeEnListado ? String(valorNumerico) : 'custom');
        }

        if (inputFilasPersonalizadas && inputFilasPersonalizadas.length) {
            inputFilasPersonalizadas.val(String(valorNumerico));
        }

        renderizarTabla();
        return true;
    }

    function renderizarTabla() {
        const contenedor = $('#contenido-tabla-datos-generales');
        registrosActuales = leerRegistros();

        if (!registrosActuales.length) {
            contenedor.html('<div class="alert alert-light border small">No existen registros de Datos Generales</div>');
            actualizarEstadoBotonExportar(0);
            return;
        }

        const totalPaginas = Math.max(1, Math.ceil(registrosActuales.length / filasPorPagina));
        if (paginaActual > totalPaginas) {
            paginaActual = totalPaginas;
        }

        const inicio = (paginaActual - 1) * filasPorPagina;
        const fin = inicio + filasPorPagina;
        const registrosPagina = registrosActuales.slice(inicio, fin);

        const filas = registrosPagina.map((registro) => {
            if (registroEnEdicionId && String(registro.id) === String(registroEnEdicionId)) {
                return `
                    <tr id="fila-edicion-${registro.id}">
                        ${camposTabla.map((campo) => `
                            <td>
                                <input class="form-control form-control-sm" type="text" data-field="${campo.key}" value="${escapeHtml(campo.obtener(registro))}" />
                            </td>
                        `).join('')}
                        <td>
                            <button class="btn btn-success btn-sm me-1" type="button" data-action="guardar-edicion" data-id="${registro.id}">Guardar</button>
                            <button class="btn btn-secondary btn-sm" type="button" data-action="cancelar-edicion">Cancelar</button>
                        </td>
                    </tr>
                `;
            }

            return `
                <tr>
                    ${camposTabla.map((campo) => `<td>${escapeHtml(campo.obtener(registro))}</td>`).join('')}
                    <td class="no-exportar">
                        <button class="btn btn-outline-primary btn-sm me-1" type="button" data-action="editar-registro" data-id="${registro.id}">Editar</button>
                        <button class="btn btn-outline-danger btn-sm" type="button" data-action="eliminar-registro" data-id="${registro.id}">Eliminar</button>
                    </td>
                </tr>
            `;
        }).join('');

        const botonesPaginas = [];
        for (let indice = 1; indice <= totalPaginas; indice += 1) {
            botonesPaginas.push(`
                <li class="page-item ${indice === paginaActual ? 'active' : ''}">
                    <button class="page-link" type="button" data-page="${indice}">${indice}</button>
                </li>
            `);
        }

        contenedor.html(`
            <div class="table-responsive small">
                <table class="table table-sm table-hover align-middle" id="tabla-datos-generales">
                    <thead>
                        <tr>
                            ${camposTabla.map((campo) => `<th>${escapeHtml(campo.label)}</th>`).join('')}
                            <th class="no-exportar">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>${filas}</tbody>
                </table>
            </div>
            <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mt-3 small">
                <span class="text-muted">Mostrando ${inicio + 1}-${Math.min(fin, registrosActuales.length)} de ${registrosActuales.length} registros</span>
                <nav aria-label="Paginación de registros">
                    <ul class="pagination pagination-sm mb-0">
                        <li class="page-item ${paginaActual === 1 ? 'disabled' : ''}">
                            <button class="page-link" type="button" data-page="${Math.max(1, paginaActual - 1)}">Anterior</button>
                        </li>
                        ${botonesPaginas.join('')}
                        <li class="page-item ${paginaActual === totalPaginas ? 'disabled' : ''}">
                            <button class="page-link" type="button" data-page="${Math.min(totalPaginas, paginaActual + 1)}">Siguiente</button>
                        </li>
                    </ul>
                </nav>
            </div>
        `);

        actualizarEstadoBotonExportar(registrosActuales.length);
    }

    function actualizarRegistro(id, datosActualizados) {
        const registros = leerRegistros();
        const indice = registros.findIndex((registro) => String(registro.id) === String(id));

        if (indice === -1) {
            return false;
        }

        registros[indice] = {
            ...registros[indice],
            ...datosActualizados
        };

        return guardarRegistros(registros);
    }

    function eliminarRegistro(id) {
        const registros = leerRegistros();
        const registrosFiltrados = registros.filter((registro) => String(registro.id) !== String(id));
        const guardado = guardarRegistros(registrosFiltrados);

        if (guardado) {
            if (paginaActual > Math.ceil(registrosFiltrados.length / filasPorPagina)) {
                paginaActual = Math.max(1, Math.ceil(registrosFiltrados.length / filasPorPagina));
            }
            renderizarTabla();
            mostrarMensaje('Registro eliminado correctamente.', 'success');
        }
    }

    function inicializarEventosTabla() {
        const contenedor = $('#contenido-tabla-datos-generales');

        contenedor.off('click.datosGenerales').on('click.datosGenerales', '[data-action="editar-registro"]', function () {
            registroEnEdicionId = $(this).data('id');
            renderizarTabla();
        });

        contenedor.on('click.datosGenerales', '[data-action="cancelar-edicion"]', function () {
            registroEnEdicionId = null;
            renderizarTabla();
        });

        contenedor.on('click.datosGenerales', '[data-action="guardar-edicion"]', function () {
            const id = $(this).data('id');
            const $fila = $(`#fila-edicion-${id}`);
            const datosActualizados = {};

            camposTabla.forEach((campo) => {
                const valor = $fila.find(`[data-field="${campo.key}"]`).val();
                datosActualizados[campo.key] = String(valor || '').trim();
            });

            const actualizado = actualizarRegistro(id, datosActualizados);
            if (actualizado) {
                registroEnEdicionId = null;
                mostrarMensaje('Registro actualizado correctamente.', 'success');
                renderizarTabla();
            } else {
                mostrarMensaje('No fue posible actualizar el registro.', 'danger');
            }
        });

        contenedor.on('click.datosGenerales', '[data-action="eliminar-registro"]', function () {
            const id = $(this).data('id');
            if (window.confirm('¿Deseas eliminar este registro?')) {
                eliminarRegistro(id);
            }
        });

        contenedor.on('click.datosGenerales', '[data-page]', function () {
            const nuevaPagina = Number($(this).data('page'));
            if (!Number.isNaN(nuevaPagina) && nuevaPagina !== paginaActual) {
                paginaActual = nuevaPagina;
                renderizarTabla();
            }
        });
    }

    function inicializarFormulario() {
        const botonGuardar = $('#btn-guardar-datos-generales');
        const botonExportar = $('#btn-exportar-datos-generales');
        const selectorFilas = $('#selector-filas-por-pagina');
        const inputFilasPersonalizadas = $('#input-filas-personalizadas');
        const botonAplicarFilasPersonalizadas = $('#btn-aplicar-filas-personalizadas');

        if (!botonGuardar.length) {
            console.warn("⚠️ Advertencia: No se encontró el botón con el ID 'btn-guardar-datos-generales' en el DOM.");
            return;
        }

        botonGuardar.on('click', () => {
            const camposFormulario = obtenerCamposFormulario();

            if (!camposFormulario.numeroDepartamento) {
                mostrarMensaje('El número de departamento es obligatorio para registrar.', 'danger');
                return;
            }

            const resultado = guardarDatosEnBaseDeDatos(camposFormulario);

            if (resultado.exito) {
                mostrarMensaje(`Datos Generales guardados con éxito. ID de Registro: ${resultado.id}`, 'success');
                limpiarCamposFormulario();
                renderizarTabla();
            } else {
                mostrarMensaje(`Error crítico al escribir en el disco: ${resultado.error}`, 'danger');
            }
        });

        if (botonExportar.length) {
            botonExportar.on('click', () => {
                if (typeof window.exportarTablaAExcel !== 'function') {
                    mostrarMensaje('La función de exportación no está disponible.', 'danger');
                    return;
                }

                const resultado = window.exportarTablaAExcel('tabla-datos-generales', 'datos-generales', {
                    filas: construirFilasParaExportacion(registrosActuales)
                });
                if (!resultado.exito) {
                    mostrarMensaje(resultado.mensaje || 'No fue posible exportar los registros.', 'danger');
                    return;
                }

                mostrarMensaje('Exportación generada correctamente.', 'success');
            });
        }

        if (selectorFilas.length) {
            selectorFilas.val(String(POR_PAGINA_POR_DEFECTO));
            if (inputFilasPersonalizadas.length) {
                inputFilasPersonalizadas.val(String(POR_PAGINA_POR_DEFECTO));
            }

            selectorFilas.on('change', () => {
                const valorSeleccionado = String(selectorFilas.val() || '');
                if (valorSeleccionado === 'custom') {
                    if (inputFilasPersonalizadas.length) {
                        inputFilasPersonalizadas.trigger('focus');
                    }
                    return;
                }

                aplicarFilasPorPagina(valorSeleccionado, selectorFilas, inputFilasPersonalizadas);
            });
        }

        if (botonAplicarFilasPersonalizadas.length) {
            botonAplicarFilasPersonalizadas.on('click', () => {
                const valor = inputFilasPersonalizadas.val();
                aplicarFilasPorPagina(valor, selectorFilas, inputFilasPersonalizadas);
            });
        }

        if (inputFilasPersonalizadas.length) {
            inputFilasPersonalizadas.on('keydown', (evento) => {
                if (evento.key === 'Enter') {
                    evento.preventDefault();
                    aplicarFilasPorPagina(inputFilasPersonalizadas.val(), selectorFilas, inputFilasPersonalizadas);
                }
            });
        }

        renderizarTabla();
        inicializarEventosTabla();
    }

    $(function () {
        inicializarFormulario();
    });
})();