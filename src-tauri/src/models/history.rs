use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryEntryPayload {
    pub id: String,
    pub timestamp: i64,
    pub method: String,
    pub url: String,
    pub headers_json: String,
    pub body: Option<String>,
    pub body_type: Option<String>,
    pub response_status: Option<u16>,
    pub response_status_text: Option<String>,
    pub response_duration_ms: Option<u64>,
    pub response_size_bytes: Option<usize>,
    pub error: Option<String>,
}
