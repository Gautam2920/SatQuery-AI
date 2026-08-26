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
