'use strict';

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const nw = require('nw');

async function empaquetar() {
    const rutaEjecutableNW = await nw.findpath();
    const rutaOrigenNW = path.dirname(rutaEjecutableNW);
    const rutaDestino = path.join(__dirname, 'dist');
    const archivoZip = path.join(__dirname, 'app.nw');
    const nombreEjecutable = process.platform === 'win32' ? 'formulario-condominio.exe' : 'formulario-condominio';

    console.log('📦 Iniciando empaquetado...');

    fs.rmSync(rutaDestino, { recursive: true, force: true });
    fs.rmSync(archivoZip, { force: true });
    fs.mkdirSync(rutaDestino, { recursive: true });

    const output = fs.createWriteStream(archivoZip);
    const archive = archiver('zip', { zlib: { level: 9 } });

    await new Promise((resolve, reject) => {
        output.on('close', resolve);
        output.on('error', reject);
        archive.on('error', reject);

        archive.pipe(output);
        archive.glob('**/*', {
            ignore: ['node_modules/**', 'dist/**', 'compilar.js', 'app.nw']
        });
        archive.finalize();
    });

    console.log('✅ Estilos y código empaquetados. Copiando motor...');

    for (const entrada of fs.readdirSync(rutaOrigenNW, { withFileTypes: true })) {
        const origen = path.join(rutaOrigenNW, entrada.name);
        const destino = path.join(rutaDestino, entrada.name);

        if (process.platform === 'win32' && entrada.name === 'nw.exe') {
            continue;
        }

        if (entrada.isDirectory()) {
            fs.cpSync(origen, destino, { recursive: true });
        } else {
            fs.copyFileSync(origen, destino);
        }
    }

    console.log('🚀 Fusionando binarios de forma nativa en Node.js...');

    const bufferEjecutable = fs.readFileSync(rutaEjecutableNW);
    const bufferZip = fs.readFileSync(archivoZip);
    const rutaFinal = path.join(rutaDestino, nombreEjecutable);

    fs.writeFileSync(rutaFinal, Buffer.concat([bufferEjecutable, bufferZip]));
    fs.unlinkSync(archivoZip);

    console.log(`\n🎉 ¡Perfecto! Tu aplicación ejecutable está lista en ${rutaDestino}.`);
}

empaquetar().catch((error) => {
    console.error('❌ Error al empaquetar:', error);
    process.exitCode = 1;
});