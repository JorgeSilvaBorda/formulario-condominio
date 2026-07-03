function cargarModulo(modulo){
    $('#contenido').load('modulos/' + modulo + '/' + modulo + ".html");
}

function exportarTablaAExcel(tablaId, nombreArchivo, opciones){
    const XLSX = obtenerLibreriaXlsx();
    const tabla = document.getElementById(tablaId);
    const opcionesExportacion = opciones || {};

    if (!XLSX) {
        return { exito: false, mensaje: 'No se pudo cargar la libreria de exportacion XLSX.' };
    }

    if (!tabla) {
        return { exito: false, mensaje: 'No existe la tabla indicada para exportar.' };
    }

    const datos = Array.isArray(opcionesExportacion.filas) && opcionesExportacion.filas.length
        ? opcionesExportacion.filas
        : convertirTablaAArray(tabla);

    if (!Array.isArray(datos) || datos.length < 2) {
        return { exito: false, mensaje: 'No existen registros para exportar.' };
    }

    const hoja = XLSX.utils.aoa_to_sheet(datos);
    const libro = XLSX.utils.book_new();
    const nombreBase = (nombreArchivo || 'exportacion').trim() || 'exportacion';

    XLSX.utils.book_append_sheet(libro, hoja, 'Datos');

    const contenido = XLSX.write(libro, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([
        contenido
    ], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');

    enlace.href = url;
    enlace.download = `${nombreBase}.xlsx`;
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    URL.revokeObjectURL(url);

    return { exito: true };
}

function obtenerLibreriaXlsx(){
    if (typeof window !== 'undefined' && window.XLSX) {
        return window.XLSX;
    }

    if (typeof window !== 'undefined' && typeof window.require === 'function') {
        try {
            return window.require('xlsx');
        } catch (error) {
            console.error('No fue posible cargar xlsx desde Node:', error);
            return null;
        }
    }

    return null;
}

function convertirTablaAArray(tabla){
    const filas = [];
    const filasTabla = tabla.querySelectorAll('tr');

    filasTabla.forEach((fila) => {
        const celdas = fila.querySelectorAll('th, td');
        const filaDatos = [];

        celdas.forEach((celda) => {
            if (celda.classList.contains('no-exportar')) {
                return;
            }

            if (celda.closest('.no-exportar')) {
                return;
            }

            const control = celda.querySelector('input, select, textarea');
            const texto = control ? control.value : celda.textContent;
            filaDatos.push((texto || '').trim());
        });

        if (filaDatos.length > 0) {
            filas.push(filaDatos);
        }
    });

    return filas;
}

window.exportarTablaAExcel = exportarTablaAExcel;
