require('dotenv').config();

const { MongoClient } = require('mongodb');

const OLD_URI = process.env.MONGO_OLD_URI;
const NEW_URI = process.env.MONGO_NEW_URI;
const OLD_DB = process.env.MONGO_OLD_DB || 'test';
const NEW_DB = process.env.MONGO_NEW_DB || 'Navalhado';
const ALLOWED_COLLECTIONS = (process.env.MONGO_COLLECTIONS || 'appointments,profissionals,servicos,users,bloqueios,configuracaogenerals').split(',').map(v => v.trim()).filter(Boolean);

if (!OLD_URI || !NEW_URI) {
  console.error('Configure as variáveis de ambiente:');
  console.error('  MONGO_OLD_URI=<uri do banco antigo>');
  console.error('  MONGO_NEW_URI=<uri do banco novo>');
  console.error('Opcional:');
  console.error('  MONGO_OLD_DB=test');
  console.error('  MONGO_NEW_DB=Navalhado');
  console.error('  MONGO_COLLECTIONS=appointments,profissionals,servicos,users,bloqueios,configuracaogenerals');
  process.exit(1);
}

async function contarDocumentos(db, collectionName) {
  return db.collection(collectionName).countDocuments();
}

async function copiarIndices(origem, destino) {
  const infos = await origem.indexInformation({ full: true });

  for (const item of Object.values(infos)) {
    if (!item || item.name === '_id_') continue;

    const key = item.key;
    const options = { ...item };
    delete options.name;
    delete options.v;
    delete options.ns;
    delete options.key;

    try {
      await destino.createIndex(key, options);
    } catch (error) {
      console.warn(`Índice ignorado em ${destino.collectionName}: ${error.message}`);
    }
  }
}

async function migrarColecao(oldDb, newDb, nomeColecao) {
  const origem = oldDb.collection(nomeColecao);
  const destino = newDb.collection(nomeColecao);

  const totalAntigo = await contarDocumentos(oldDb, nomeColecao);
  const documentos = await origem.find({}).toArray();

  if (documentos.length > 0) {
    await destino.deleteMany({});
    await destino.insertMany(documentos, { ordered: false });
  }

  await copiarIndices(origem, destino);

  const totalNovo = await contarDocumentos(newDb, nomeColecao);
  const ok = totalAntigo === totalNovo;

  console.log(`[${nomeColecao}] antigo=${totalAntigo} novo=${totalNovo} status=${ok ? 'OK' : 'DIVERGENTE'}`);

  return { colecao: nomeColecao, antigo: totalAntigo, novo: totalNovo, ok };
}

async function main() {
  const clienteAntigo = new MongoClient(OLD_URI);
  const clienteNovo = new MongoClient(NEW_URI);

  try {
    await clienteAntigo.connect();
    await clienteNovo.connect();

    const oldDb = clienteAntigo.db(OLD_DB);
    const newDb = clienteNovo.db(NEW_DB);

    const colecoes = await oldDb.listCollections().toArray();
    const nomes = colecoes
      .map(item => item.name)
      .filter(nome => ALLOWED_COLLECTIONS.includes(nome));

    console.log(`Banco antigo: ${OLD_DB}`);
    console.log(`Banco novo: ${NEW_DB}`);
    console.log('Coleções permitidas:', ALLOWED_COLLECTIONS.join(', '));
    console.log('Coleções encontradas para migrar:', nomes.length ? nomes.join(', ') : 'nenhuma');

    if (nomes.length === 0) {
      console.log('\n⚠️ Nenhuma coleção compatível com o projeto foi localizada no banco antigo.');
      return;
    }

    const resultado = [];
    for (const nomeColecao of nomes) {
      const item = await migrarColecao(oldDb, newDb, nomeColecao);
      resultado.push(item);
    }

    console.log('\nResumo final:');
    console.table(resultado);

    const allOk = resultado.every(item => item.ok);
    console.log(allOk ? '\n✅ Migração concluída com sucesso.' : '\n⚠️ Há divergência de contagem em alguma coleção.');
  } finally {
    await clienteAntigo.close();
    await clienteNovo.close();
  }
}

main().catch((error) => {
  console.error('Erro durante a migração:', error);
  process.exit(1);
});
