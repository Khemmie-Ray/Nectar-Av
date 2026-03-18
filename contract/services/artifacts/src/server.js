import http from "node:http";
import {URL} from "node:url";
import {generateArtifact} from "./generate.js";
import {decryptEnvelope} from "./decrypt.js";
import {createAuthContextFile} from "./auth-context.js";
import {createSessionSigsFile} from "./session-sigs.js";
import {getConfig} from "./config.js";
import {loadRegistry} from "./registry.js";

const config = getConfig();

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "GET" && url.pathname === "/health") {
      return json(res, 200, {ok: true});
    }

    if (req.method === "GET" && url.pathname === "/artifacts") {
      return json(res, 200, loadRegistry(config.dataDir));
    }

    if (req.method === "POST" && url.pathname === "/artifacts/settlement") {
      const body = await readJson(req);
      const result = await generateArtifact({
        source: body.source,
        encrypt: body.encrypt,
        store: body.store,
        poolAddress: body.poolAddress
      });

      return json(res, 201, {
        cid: result.stored.cid,
        pool: result.registryEntry.pool,
        source: result.registryEntry.source,
        encryptionProvider: result.registryEntry.encryptionProvider,
        storageProvider: result.registryEntry.storageProvider
      });
    }

    if (req.method === "POST" && url.pathname === "/artifacts/decrypt") {
      const body = await readJson(req);
      const result = await decryptEnvelope({
        cid: body.cid,
        inputPath: body.inputPath,
        authContextJson: body.authContextJson,
        authContextFile: body.authContextFile,
        sessionSigsJson: body.sessionSigsJson,
        sessionSigsFile: body.sessionSigsFile
      });

      return json(res, 200, {
        pool: result.envelope.pool,
        provider: result.envelope.encryption.provider,
        plaintext: result.decrypted.plaintext,
        convertedData: result.decrypted.convertedData
      });
    }

    if (req.method === "POST" && url.pathname === "/artifacts/session-sigs") {
      const body = await readJson(req);
      const result = await createSessionSigsFile({
        cid: body.cid,
        inputPath: body.inputPath,
        privateKey: body.privateKey,
        outputPath: body.outputPath,
        expiration: body.expiration,
        domain: body.domain
      });

      return json(res, 201, {
        outputPath: result.outputPath,
        address: result.address
      });
    }

    if (req.method === "POST" && url.pathname === "/artifacts/auth-context") {
      const body = await readJson(req);
      const result = await createAuthContextFile({
        cid: body.cid,
        inputPath: body.inputPath,
        privateKey: body.privateKey,
        outputPath: body.outputPath,
        expiration: body.expiration,
        domain: body.domain
      });

      return json(res, 201, {
        outputPath: result.outputPath,
        address: result.address
      });
    }

    return json(res, 404, {error: "Not found"});
  } catch (error) {
    return json(res, 500, {error: error.message});
  }
});

server.listen(config.port, () => {
  process.stdout.write(`Artifact service listening on http://127.0.0.1:${config.port}\n`);
});

function json(res, status, payload) {
  res.writeHead(status, {"content-type": "application/json"});
  res.end(JSON.stringify(payload, null, 2));
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}
