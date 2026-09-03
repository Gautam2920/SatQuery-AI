import uuid

from backend.app.models.project import Project


def test_create_and_read_project(db_session):
    project = Project(
        name="Test Project",
        description="Database integration test",
    )

    db_session.add(project)
    db_session.flush()
    db_session.refresh(project)

    assert isinstance(project.id, uuid.UUID)
    assert project.name == "Test Project"
    assert project.description == "Database integration test"
    assert project.created_at is not None
    assert project.updated_at is not None

    retrieved = db_session.get(Project, project.id)

    assert retrieved is not None
    assert retrieved.id == project.id
    assert retrieved.name == "Test Project"


def test_create_project_api(client):
    response = client.post(
        "/projects",
        json={
            "name": "API Project",
            "description": "Created through the API",
        },
    )

    assert response.status_code == 201

    data = response.json()

    assert data["name"] == "API Project"
    assert data["description"] == "Created through the API"
    assert "id" in data
    assert "created_at" in data
    assert "updated_at" in data


def test_list_projects_api(client):
    client.post(
        "/projects",
        json={
            "name": "Project One",
            "description": "First project",
        },
    )

    client.post(
        "/projects",
        json={
            "name": "Project Two",
            "description": "Second project",
        },
    )

    response = client.get("/projects")

    assert response.status_code == 200

    data = response.json()

    assert len(data) == 2
    assert {project["name"] for project in data} == {
        "Project One",
        "Project Two",
    }


def test_get_project_api(client):
    create_response = client.post(
        "/projects",
        json={
            "name": "Fetch Me",
            "description": "Project retrieval test",
        },
    )

    assert create_response.status_code == 201

    project_id = create_response.json()["id"]

    response = client.get(f"/projects/{project_id}")

    assert response.status_code == 200

    data = response.json()

    assert data["id"] == project_id
    assert data["name"] == "Fetch Me"
    assert data["description"] == "Project retrieval test"


def test_get_project_api_returns_404_for_missing_project(client):
    project_id = uuid.uuid4()

    response = client.get(f"/projects/{project_id}")

    assert response.status_code == 404
    assert response.json()["detail"] == "Project not found"


def test_delete_project_api(client):
    create_response = client.post(
        "/projects",
        json={
            "name": "Delete Me",
            "description": "Deletion test",
        },
    )

    assert create_response.status_code == 201

    project_id = create_response.json()["id"]

    delete_response = client.delete(f"/projects/{project_id}")

    assert delete_response.status_code == 204

    get_response = client.get(f"/projects/{project_id}")

    assert get_response.status_code == 404


def test_delete_project_api_returns_404_for_missing_project(client):
    project_id = uuid.uuid4()

    response = client.delete(f"/projects/{project_id}")

    assert response.status_code == 404
    assert response.json()["detail"] == "Project not found"
