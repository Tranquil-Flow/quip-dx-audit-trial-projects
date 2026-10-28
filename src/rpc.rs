//! Minimal blocking JSON-RPC client over HTTPS (Substrate RPC).

use serde_json::{json, Value};

pub struct Rpc {
    url: String,
    next_id: u64,
}

pub struct RpcError(pub String);

impl std::fmt::Debug for RpcError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl std::fmt::Display for RpcError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl Rpc {
    pub fn new(url: &str) -> Self {
        Self { url: url.to_string(), next_id: 1 }
    }

    pub fn url(&self) -> &str {
        &self.url
    }

    pub fn call(&mut self, method: &str, params: Vec<Value>) -> Result<Value, RpcError> {
        let id = self.next_id;
        self.next_id += 1;
        let body = json!({ "jsonrpc": "2.0", "id": id, "method": method, "params": params });
        let resp = ureq::post(&self.url)
            .set("content-type", "application/json")
            .timeout(std::time::Duration::from_secs(60))
            .send_string(&body.to_string())
            .map_err(|e| RpcError(format!("HTTP/RPC transport error for {method}: {e}")))?;
        let text = resp
            .into_string()
            .map_err(|e| RpcError(format!("response read error for {method}: {e}")))?;
        let v: Value = serde_json::from_str(&text)
            .map_err(|e| RpcError(format!("bad JSON from node for {method}: {e}\n{text}")))?;
        if let Some(err) = v.get("error") {
            return Err(RpcError(format!("RPC {method} error: {err}")));
        }
        v.get("result")
            .cloned()
            .ok_or_else(|| RpcError(format!("RPC {method}: no result field: {text}")))
    }

    /// `state_getStorage` for a raw hex key, optionally at a block hash.
    pub fn storage_at(&mut self, key_hex: &str, at: Option<&str>) -> Result<Option<Vec<u8>>, RpcError> {
        let params = match at {
            Some(h) => vec![json!(key_hex), json!(h)],
            None => vec![json!(key_hex)],
        };
        let r = self.call("state_getStorage", params)?;
        match r {
            Value::Null => Ok(None),
            Value::String(s) => {
                let h = s.strip_prefix("0x").unwrap_or(&s);
                hex::decode(h)
                    .map(Some)
                    .map_err(|e| RpcError(format!("bad hex storage value: {e}")))
            }
            other => Err(RpcError(format!("unexpected storage result: {other}"))),
        }
    }

    pub fn submit_extrinsic(&mut self, xt_hex: &str) -> Result<String, RpcError> {
        let r = self.call("author_submitExtrinsic", vec![json!(xt_hex)])?;
        r.as_str()
            .map(|s| s.to_string())
            .ok_or_else(|| RpcError(format!("unexpected submit result: {r}")))
    }

    pub fn payment_query_info(&mut self, xt_hex: &str) -> Result<Value, RpcError> {
        self.call("payment_queryInfo", vec![json!(xt_hex)])
    }
}
