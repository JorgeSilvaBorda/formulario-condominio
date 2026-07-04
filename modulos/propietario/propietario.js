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
	let validacionRutIniciada = false;

	const camposTabla = [
		{ key: 'nombrePropietario', label: 'Nombre Propietario', obtener: (registro) => registro.nombrePropietario || registro.nombre_propietario || '' },
		{ key: 'rutPropietario', label: 'RUT Propietario', obtener: (registro) => formatearRutVisual(registro.rutPropietario || registro.rut_propietario || '') },
		{ key: 'correoPropietario', label: 'Correo Propietario', obtener: (registro) => registro.correoPropietario || registro.correo_propietario || '' },
		{ key: 'telefonoPropietario', label: 'Telefono Propietario', obtener: (registro) => registro.telefonoPropietario || registro.telefono_propietario || '' },
		{ key: 'fechaCompraPropietario', label: 'Fecha Compra Propietario', obtener: (registro) => registro.fechaCompraPropietario || registro.fecha_compra_propietario || '' },
		{ key: 'fechaVentaPropietario', label: 'Fecha Venta Propietario', obtener: (registro) => registro.fechaVentaPropietario || registro.fecha_venta_propietario || '' },
		{ key: 'marcaVehiculo', label: 'Marca Vehiculo', obtener: (registro) => registro.marcaVehiculo || registro.marca_vehiculo || '' },
		{ key: 'modeloVehiculoPropietario', label: 'Modelo Vehiculo Propietario', obtener: (registro) => registro.modeloVehiculoPropietario || registro.modelo_vehiculo_propietario || registro.vehiculoPropietario || registro.vehiculo_propietario || '' },
		{ key: 'colorVehiculo', label: 'Color Vehiculo', obtener: (registro) => registro.colorVehiculo || registro.color_vehiculo || '' },
		{ key: 'patenteVehiculo', label: 'Patente Vehiculo', obtener: (registro) => registro.patenteVehiculo || registro.patente_vehiculo || '' }
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
		return path ? path.join(obtenerRutaDatos(), 'propietario.json') : 'datos_app/propietario.json';
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
			console.error('No se pudieron leer los registros de propietario:', error);
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
			console.error('No se pudieron guardar los registros de propietario:', error);
			return false;
		}
	}

	function guardarDatosEnBaseDeDatos(nuevosCampos) {
		if (!tieneSoporteNode) {
			return { exito: false, error: 'La aplicacion no tiene acceso a Node.js en este entorno.' };
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

			return { exito: true, id: nuevoRegistro.id };
		} catch (error) {
			console.error('Error en sistema de archivos de Propietario:', error);
			return { exito: false, error: error.message };
		}
	}

	function limpiarRut(rut) {
		return String(rut || '')
			.replace(/[^0-9kK]/g, '')
			.toUpperCase();
	}

	function formatearRutVisual(rut) {
		const rutLimpio = limpiarRut(rut);
		if (rutLimpio.length < 2) {
			return rutLimpio;
		}

		const cuerpo = rutLimpio.slice(0, -1);
		const dv = rutLimpio.slice(-1);
		const cuerpoConPuntos = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
		return `${cuerpoConPuntos}-${dv}`;
	}

	function normalizarRutParaGuardar(rut) {
		const rutLimpio = limpiarRut(rut);
		if (rutLimpio.length < 2) {
			return rutLimpio;
		}

		const cuerpo = rutLimpio.slice(0, -1);
		const dv = rutLimpio.slice(-1);
		return `${cuerpo}-${dv}`;
	}

	function validarRut(rut) {
		const rutLimpio = limpiarRut(rut);
		if (!/^[0-9]+[0-9K]$/.test(rutLimpio)) {
			return false;
		}

		const cuerpo = rutLimpio.slice(0, -1);
		const dvIngresado = rutLimpio.slice(-1);

		let suma = 0;
		let multiplo = 2;

		for (let i = cuerpo.length - 1; i >= 0; i -= 1) {
			suma += Number(cuerpo[i]) * multiplo;
			multiplo = multiplo === 7 ? 2 : multiplo + 1;
		}

		const resto = 11 - (suma % 11);
		const dvEsperado = resto === 11 ? '0' : (resto === 10 ? 'K' : String(resto));
		return dvEsperado === dvIngresado;
	}

	function normalizarPatente(valor) {
		return String(valor || '')
			.trim()
			.toUpperCase();
	}

	function obtenerCamposFormulario() {
		return {
			nombrePropietario: String($('#nombre-propietario').val() || '').trim(),
			rutPropietario: normalizarRutParaGuardar($('#rut-propietario').val() || ''),
			correoPropietario: String($('#correo-propietario').val() || '').trim(),
			telefonoPropietario: String($('#telefono-propietario').val() || '').trim(),
			fechaCompraPropietario: String($('#fecha-compra-propietario').val() || '').trim(),
			fechaVentaPropietario: String($('#fecha-venta-propietario').val() || '').trim(),
			marcaVehiculo: String($('#marca-vehiculo').val() || '').trim(),
			modeloVehiculoPropietario: String($('#modelo-vehiculo-propietario').val() || '').trim(),
			colorVehiculo: String($('#color-vehiculo').val() || '').trim(),
			patenteVehiculo: normalizarPatente($('#patente-vehiculo').val() || '')
		};
	}

	function limpiarCamposFormulario() {
		const ids = [
			'nombre-propietario',
			'rut-propietario',
			'correo-propietario',
			'telefono-propietario',
			'fecha-compra-propietario',
			'fecha-venta-propietario',
			'marca-vehiculo',
			'modelo-vehiculo-propietario',
			'color-vehiculo',
			'patente-vehiculo'
		];

		ids.forEach((id) => {
			$(`#${id}`).val('');
		});

		validacionRutIniciada = false;
		actualizarEstadoValidacionRut();
	}

	function actualizarEstadoValidacionRut() {
		const inputRut = $('#rut-propietario');
		const mensajeRut = $('#mensaje-error-rut-propietario');
		const botonGuardar = $('#btn-guardar-propietario');

		if (!inputRut.length) {
			return false;
		}

		if (!validacionRutIniciada) {
			inputRut.removeClass('is-invalid');
			if (mensajeRut.length) {
				mensajeRut.addClass('d-none');
			}
			if (botonGuardar.length) {
				botonGuardar.prop('disabled', true);
			}
			return false;
		}

		const valorActual = String(inputRut.val() || '').trim();
		if (!valorActual) {
			inputRut.addClass('is-invalid');
			if (mensajeRut.length) {
				mensajeRut.removeClass('d-none');
			}
			if (botonGuardar.length) {
				botonGuardar.prop('disabled', true);
			}
			return false;
		}

		const rutEsValido = validarRut(valorActual);
		inputRut.toggleClass('is-invalid', !rutEsValido);

		if (mensajeRut.length) {
			mensajeRut.toggleClass('d-none', rutEsValido);
		}

		if (botonGuardar.length) {
			botonGuardar.prop('disabled', !rutEsValido);
		}

		return rutEsValido;
	}

	function mostrarMensaje(mensaje, tipo, tiempoDesaparicion) {
		const contenedor = $('#mensaje-guardar-propietario');
		if (!contenedor.length) {
			return;
		}

		if (contenedor.data('timeoutId')) {
			clearTimeout(contenedor.data('timeoutId'));
		}

		contenedor
			.removeClass('d-none alert-success alert-danger')
			.addClass(`alert alert-${tipo}`)
			.html(mensaje);

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
		const botonExportar = $('#btn-exportar-propietario');
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
		const contenedor = $('#contenido-tabla-propietario');
		registrosActuales = leerRegistros();

		if (!registrosActuales.length) {
			contenedor.html('<div class="alert alert-light border small">No existen registros de Propietario</div>');
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
				<table class="table table-sm table-hover align-middle" id="tabla-propietario">
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
				<nav aria-label="Paginacion de registros propietario">
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

	function validarCamposFormulario(campos) {
		if (!campos.nombrePropietario) {
			return 'El nombre del propietario es obligatorio.';
		}

		if (!campos.rutPropietario) {
			return 'El RUT del propietario es obligatorio.';
		}

		if (!validarRut(campos.rutPropietario)) {
			return 'El RUT ingresado no es valido.';
		}

		if (campos.fechaCompraPropietario && campos.fechaVentaPropietario) {
			if (campos.fechaVentaPropietario < campos.fechaCompraPropietario) {
				return 'La fecha de venta no puede ser menor a la fecha de compra.';
			}
		}

		return null;
	}

	function inicializarEventosTabla() {
		const contenedor = $('#contenido-tabla-propietario');

		contenedor.off('click.propietario').on('click.propietario', '[data-action="editar-registro"]', function () {
			registroEnEdicionId = $(this).data('id');
			renderizarTabla();
		});

		contenedor.on('click.propietario', '[data-action="cancelar-edicion"]', function () {
			registroEnEdicionId = null;
			renderizarTabla();
		});

		contenedor.on('click.propietario', '[data-action="guardar-edicion"]', function () {
			const id = $(this).data('id');
			const $fila = $(`#fila-edicion-${id}`);
			const datosActualizados = {};

			camposTabla.forEach((campo) => {
				const valor = $fila.find(`[data-field="${campo.key}"]`).val();
				datosActualizados[campo.key] = String(valor || '').trim();
			});

			datosActualizados.rutPropietario = normalizarRutParaGuardar(datosActualizados.rutPropietario);
			datosActualizados.patenteVehiculo = normalizarPatente(datosActualizados.patenteVehiculo);

			const errorValidacion = validarCamposFormulario(datosActualizados);
			if (errorValidacion) {
				mostrarMensaje(errorValidacion, 'danger');
				return;
			}

			const actualizado = actualizarRegistro(id, datosActualizados);
			if (actualizado) {
				registroEnEdicionId = null;
				mostrarMensaje('Registro actualizado correctamente.', 'success');
				renderizarTabla();
			} else {
				mostrarMensaje('No fue posible actualizar el registro.', 'danger');
			}
		});

		contenedor.on('click.propietario', '[data-action="eliminar-registro"]', function () {
			const id = $(this).data('id');
			if (window.confirm('Deseas eliminar este registro?')) {
				eliminarRegistro(id);
			}
		});

		contenedor.on('click.propietario', '[data-page]', function () {
			const nuevaPagina = Number($(this).data('page'));
			if (!Number.isNaN(nuevaPagina) && nuevaPagina !== paginaActual) {
				paginaActual = nuevaPagina;
				renderizarTabla();
			}
		});
	}

	function inicializarFormulario() {
		const botonGuardar = $('#btn-guardar-propietario');
		const botonLimpiar = $('#btn-limpiar-propietario');
		const botonExportar = $('#btn-exportar-propietario');
		const selectorFilas = $('#selector-filas-propietario');
		const inputFilasPersonalizadas = $('#input-filas-personalizadas-propietario');
		const botonAplicarFilasPersonalizadas = $('#btn-aplicar-filas-personalizadas-propietario');
		const inputRut = $('#rut-propietario');

		if (!botonGuardar.length) {
			console.warn('No se encontro el boton de guardado de propietario.');
			return;
		}

		if (inputRut.length) {
			inputRut.on('input', function () {
				$(this).val(formatearRutVisual($(this).val()));
				actualizarEstadoValidacionRut();
			});

			inputRut.on('blur', function () {
				if (!validacionRutIniciada) {
					validacionRutIniciada = true;
				}
				$(this).val(formatearRutVisual($(this).val()));
				actualizarEstadoValidacionRut();
			});

			actualizarEstadoValidacionRut();
		}

		botonGuardar.on('click', () => {
			if (!actualizarEstadoValidacionRut()) {
				mostrarMensaje('El RUT ingresado no es valido.', 'danger');
				return;
			}

			const camposFormulario = obtenerCamposFormulario();
			const errorValidacion = validarCamposFormulario(camposFormulario);

			if (errorValidacion) {
				mostrarMensaje(errorValidacion, 'danger');
				return;
			}

			const resultado = guardarDatosEnBaseDeDatos(camposFormulario);

			if (resultado.exito) {
				mostrarMensaje(`Propietario guardado con exito. ID de Registro: ${resultado.id}`, 'success');
				limpiarCamposFormulario();
				renderizarTabla();
			} else {
				mostrarMensaje(`Error critico al escribir en el disco: ${resultado.error}`, 'danger');
			}
		});

		if (botonLimpiar.length) {
			botonLimpiar.on('click', () => {
				limpiarCamposFormulario();
				mostrarMensaje('Formulario limpiado correctamente.', 'success');
			});
		}

		if (botonExportar.length) {
			botonExportar.on('click', () => {
				if (typeof window.exportarTablaAExcel !== 'function') {
					mostrarMensaje('La funcion de exportacion no esta disponible.', 'danger');
					return;
				}

				const resultado = window.exportarTablaAExcel('tabla-propietario', 'propietario', {
					filas: construirFilasParaExportacion(registrosActuales)
				});

				if (!resultado.exito) {
					mostrarMensaje(resultado.mensaje || 'No fue posible exportar los registros.', 'danger');
					return;
				}

				mostrarMensaje('Exportacion generada correctamente.', 'success');
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
