const BASE_URL = "http://localhost:5000";

export const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`
});

export const API = {
  notes: {
    list: () => fetch(`${BASE_URL}/api/notes/`, { headers: authHeaders() }),
    myNotes: () => fetch(`${BASE_URL}/api/notes/my-notes`, { headers: authHeaders() }),
    get: (id) => fetch(`${BASE_URL}/api/notes/${id}`, { headers: authHeaders() }),
    upload: (FormData) => fetch(`${BASE_URL}/api/notes/upload`, {
      method: "POST",
      headers: authHeaders(),
      body: FormData
    }),
    deleteNote: (id) => fetch(`${BASE_URL}/api/notes/${id}`, {
      method: "DELETE",
      headers: authHeaders()
    }),
    download: (id) => fetch(`${BASE_URL}/api/notes/${id}/download`,
      { headers: authHeaders() }
    ),
    preview: (id) => fetch(`${BASE_URL}/api/notes/${id}/download`,
      { headers: authHeaders() }
    ),
    getSummary: (id) => fetch(`${BASE_URL}/api/notes/${id}/ai/summary`,
      { headers: authHeaders() }
    ),
    generateSummary: (id) => fetch(`${BASE_URL}/api/notes/${id}/ai/summary`, {
      method: "POST",
      headers: authHeaders()
    })
  }
};