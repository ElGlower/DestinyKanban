# Reglas de Firestore — Colección activity_log

## Qué agregar en Firebase Console > Firestore > Reglas

Pega estas reglas en tu proyecto de Firebase para que el sistema de actividad funcione:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // === PROYECTOS ===
    match /projects/{projectId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }

    // === TAREAS ===
    match /tasks/{taskId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }

    // === USUARIOS ===
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }

    // === PRESENCIA ===
    match /presence/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }

    // === ACTIVIDAD (nueva colección) ===
    // Cualquier usuario autenticado puede ESCRIBIR eventos de actividad
    // Solo elglower (admin) puede leerlos — se aplica en el frontend, 
    // pero aquí solo permitimos leer a autenticados (el panel está solo visible para admin)
    match /activity_log/{logId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if false; // Los logs son inmutables
    }
  }
}
```

## Notas importantes

- La colección `activity_log` es **de solo escritura/lectura** para usuarios autenticados
- El panel de actividad solo es visible para **elglower** (control en el frontend)
- Los logs **no se pueden editar ni borrar** (protección de integridad)
- El índice compuesto para la query puede ser necesario en Firebase:
  - Colección: `activity_log`
  - Campo 1: `timestampISO` (Descendente)
  - Tipo: Colección

## Índice requerido en Firebase Console > Firestore > Índices

Si ves un error de índice en la consola del navegador, copia el link que aparece en el error 
o ve a Firebase Console > Firestore Database > Índices > Crear índice:

- **Colección**: activity_log  
- **Campo**: timestampISO → Descendente  
- **Ámbito**: Colección
