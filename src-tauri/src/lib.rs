// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::fs;
use std::path::PathBuf;

fn get_git_root() -> PathBuf {
    let mut dir = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    loop {
        if dir.join(".git").exists() {
            return dir;
        }
        if let Some(parent) = dir.parent() {
            dir = parent.to_path_buf();
        } else {
            break;
        }
    }
    std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."))
}

#[tauri::command]
fn read_config() -> Result<String, String> {
    let root = get_git_root();
    let config_path = root.join("config.json");
    if !config_path.exists() {
        let default_config = r#"{
  "phases": ["Pre-prod", "Launch", "Competición", "Archivo"],
  "roles": ["Desarrollador", "Diseñador", "Moderador", "Administrador", "Owner"],
  "priorities": ["Baja", "Media", "Alta", "Crítica"],
  "columns": ["Backlog", "To Do", "In Progress", "Done"]
}"#;
        fs::write(&config_path, default_config).map_err(|e| e.to_string())?;
        return Ok(default_config.to_string());
    }
    fs::read_to_string(&config_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn read_projects() -> Result<String, String> {
    let root = get_git_root();
    let data_dir = root.join("data");
    let projects_path = data_dir.join("projects.json");

    if !data_dir.exists() {
        fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
    }

    if !projects_path.exists() {
        let default_projects = r#"[

  
]"#;
        fs::write(&projects_path, default_projects).map_err(|e| e.to_string())?;
        return Ok(default_projects.to_string());
    }

    fs::read_to_string(&projects_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_projects(projects_json: String) -> Result<(), String> {
    let root = get_git_root();
    let data_dir = root.join("data");
    let projects_path = data_dir.join("projects.json");

    if !data_dir.exists() {
        fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
    }

    fs::write(&projects_path, projects_json).map_err(|e| e.to_string())
}

#[tauri::command]
fn read_tasks(project_id: String) -> Result<String, String> {
    let root = get_git_root();
    let data_dir = root.join("data");
    let sanitized_id = project_id
        .replace("..", "")
        .replace("/", "")
        .replace("\\", "");
    let tasks_path = data_dir.join(format!("tasks_{}.json", sanitized_id));

    if !data_dir.exists() {
        fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
    }

    if !tasks_path.exists() {
        let default_tasks = "[]";
        fs::write(&tasks_path, default_tasks).map_err(|e| e.to_string())?;
        return Ok(default_tasks.to_string());
    }

    fs::read_to_string(&tasks_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_tasks(project_id: String, tasks_json: String) -> Result<(), String> {
    let root = get_git_root();
    let data_dir = root.join("data");
    let sanitized_id = project_id
        .replace("..", "")
        .replace("/", "")
        .replace("\\", "");
    let tasks_path = data_dir.join(format!("tasks_{}.json", sanitized_id));

    if !data_dir.exists() {
        fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
    }

    fs::write(&tasks_path, tasks_json).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_config(config_json: String) -> Result<(), String> {
    let root = get_git_root();
    let config_path = root.join("config.json");
    fs::write(&config_path, config_json).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_tasks_file(project_id: String) -> Result<(), String> {
    let root = get_git_root();
    let data_dir = root.join("data");
    let sanitized_id = project_id
        .replace("..", "")
        .replace("/", "")
        .replace("\\", "");
    let tasks_path = data_dir.join(format!("tasks_{}.json", sanitized_id));

    if tasks_path.exists() {
        fs::remove_file(&tasks_path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            read_config,
            write_config,
            read_projects,
            write_projects,
            read_tasks,
            write_tasks,
            delete_tasks_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
