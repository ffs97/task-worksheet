import { get, set } from "https://cdn.jsdelivr.net/npm/idb-keyval@6/+esm";

var todo = {
    "trackers": [],
    "tracker_info": {}
};

var selectedTracker, selectedProject, selectedTask;

// -------------------------------------
// HELPERS

const charactersForId = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
function generateRandomId(len) {
    var text = "";
    for (var i = 0; i < len; i++) {
        text += charactersForId.charAt(Math.floor(Math.random() * charactersForId.length));
    }
    return text;
}

function getActiveTrackerInfo() {
    return todo.tracker_info[selectedTracker];
}

function getActiveProjectInfo() {
    return getActiveTrackerInfo().project_info[selectedProject]
}

function getActiveTaskInfo() {
    return getActiveProjectInfo().task_info[selectedTask];
}

// -------------------------------------

// -------------------------------------
// TRACKER

const trackerIdPrefix = "#tracker-id_"
const descPlaceholder = "Description of the tracker goes here ...";

var trackerIdElem, trackerTitleElem, trackerDescElem;

function addTrackerFunctions() {
    trackerIdElem = $("#tracker-header-id");
    trackerTitleElem = $("#tracker-header-title input");
    trackerDescElem = $("#tracker-header-description textarea");

    trackerTitleElem.change(function () {
        todo.tracker_info[selectedTracker].title = $(this).val();
    });
    trackerTitleElem.on("focusin", function () {
        trackerDescElem.attr("placeholder", descPlaceholder);
    });
    trackerTitleElem.on("focusout", function () {
        trackerDescElem.attr("placeholder", "");
    });
    trackerDescElem.change(function () {
        todo.tracker_info[selectedTracker].description = $(this).val();
    });
    trackerDescElem.on("blur keyup paste input", function () {
        $(this).css("height", 0);
        $(this).css("height", $(this).prop("scrollHeight") + "px");
        $(this).css("margin-bottom", ($(this).val() == "") ? "0px" : "37px");
    });

    var trackerDialog = $("#tracker-dialog-container");

    $("#tracker-add-button").click(function () {
        trackerDialog.css("visibility", "visible");
    });

    $("#tracker-dialog-close-button").click(function () {
        trackerDialog.css("visibility", "hidden");
        $("#tracker-dialog-id-input").val("");
        $("#tracker-dialog-create-button").prop("disabled", true);
    });

    $("#tracker-dialog-id-input").keyup(function () {
        if ($(this).val() != "") {
            $("#tracker-dialog-create-button").prop("disabled", false);
        } else {
            $("#tracker-dialog-create-button").prop("disabled", true);
        }
    });

    $("#tracker-dialog-create-button").click(function () {
        if (!$(this).prop("disabled")) {
            createNewTracker($("#tracker-dialog-id-input").val())
            trackerDialog.css("visibility", "hidden");
            $("#tracker-dialog-id-input").val("");
            $("#tracker-dialog-create-button").prop("disabled", true);
        }
    });
}

function selectTracker(id) {
    if (id === selectedTracker) return;
    if (selectedTracker != undefined) {
        $(trackerIdPrefix + selectedTracker).removeClass("selected");
    }
    unselectTask();
    unselectProject();

    selectedTracker = id;
    $(trackerIdPrefix + id).addClass("selected");
    const info = getActiveTrackerInfo();
    trackerIdElem.text("#" + info.id);
    trackerTitleElem.val(info.title);
    if (info.description != "") {
        trackerDescElem.val(info.description);
        trackerDescElem.css("margin-bottom", "37px");
    }
    clearProjects();
    addProjects(id);
    $(".tracker-header").css("visibility", "visible");
}

function addTracker(id) {
    $("#tracker-list").append("<li class=\"tracker-id\" id=\"" + trackerIdPrefix.substring(1) + id + "\"><span>" + id + "</span></li>")
    $(trackerIdPrefix + id).click(function () {
        selectTracker(id);
    });
}

function createNewTracker(id, title = "", description = "") {
    todo.trackers.push(id);
    todo.tracker_info[id] = { id: id, title: title, description: description, projects: [], project_info: {} };
    addTracker(id);
    selectTracker(id);
    trackerTitleElem.focus()
}

function clearTrackers() {
    $("#tracker-list").empty();
    clearProjects();
    unselectTask();
    unselectProject();
    selectedTracker = undefined;
    $(".tracker-header").css("visibility", "hidden");
}

// -------------------------------------

// -------------------------------------
// PROJECT

const projectIdPrefix = "#project-box_"

const newProjectHTML = '\
    <div class="project" id="{project_id}"> \
        <div class="project-header"> \
            <span class="project-title">{project_title}</span> \
            <span class="project-task-add"><img src="img/add.png"></span> \
        </div> \
        <div class="project-status"><span class="project-status-green" style="flex-basis: 100%"></span></div> \
        <div class="project-task-box">\
            <div class="project-task-placeholder">Such empty, much wow</div>\
        </div> \
    </div>';

function addProjectFunctions() {
    $("#project-add-button").click(function () {
        createNewProject();
    });
}

function bindProjectCalls(id) {
    var projectBox = $(projectIdPrefix + id);
    projectBox.find(".project-title").click(function () {
        selectProject(id);
    });
    projectBox.find(".project-task-add").click(function () {
        createNewTask(id);
    });
    var taskBox = projectBox.find(".project-task-box");
    taskBox.sortable({
        handle: ".task-drag",
        helper: "clone",
        opacity: 0.65,
        axis: "y",
        containment: "parent",
        cursor: "move",
        delay: 150,
        revert: 100,
        update: function (_event, _ui) {
            var tasks = [];
            taskBox.children(".task").each(function () {
                tasks.push($(this).attr("id").substring(taskIdPrefix.length - 1));
            });
            getActiveTrackerInfo().project_info[id].tasks = tasks.slice();
        }
    });
}

function selectProject(id) {
    unselectTask();
    selectedProject = id;
    $(".project.selected").removeClass("selected");
    $(projectIdPrefix + id).addClass("selected");
    uploadProjectToInfoBox();
    $("#info-box-wrapper").css("visibility", "visible");
}

function unselectProject() {
    selectedTask = undefined;
    selectedProject = undefined;
    $(".project.selected").removeClass("selected");
    $("#info-box-wrapper").css("visibility", "hidden");
}

function addProject(id) {
    var projectColumns = $(".tracker-project-box .project-column");
    var shortestIndex, minHeight = Number.MAX_SAFE_INTEGER;
    projectColumns.each(function (index) {
        const colHeight = $(this).height();
        if (minHeight > colHeight) {
            shortestIndex = index;
            minHeight = colHeight;
        }
    });
    var projectHTML = newProjectHTML
        .replaceAll("{project_id}", projectIdPrefix.substring(1) + id)
        .replaceAll("{project_title}", getActiveTrackerInfo().project_info[id].title);
    projectColumns.eq(shortestIndex).append(projectHTML);
    bindProjectCalls(id);
    addTasks(id);
}

function createNewProject(title = "Untitled project") {
    const id = generateRandomId(10);
    var trackerInfo = getActiveTrackerInfo();
    trackerInfo.projects.push(id);
    trackerInfo.project_info[id] = { id: id, title: title, notes: {}, tasks: [], task_info: {} };
    addProject(id);
    selectProject(id);
    $("#item-title").focus();
}

function addProjects(trackerId) {
    todo.tracker_info[trackerId].projects.forEach(projectId => {
        addProject(projectId);
    });
}

function clearProjects() {
    $(".tracker-project-box .project-column").empty();
}

// -------------------------------------

// -------------------------------------
// TASK

const taskIdPrefix = "#task-item_"

const newTaskHTML = '\
    <div class="task" id="{task_id}">\
        <span class="task-status"><img src="img/status/{task_status}.png"></span>\
        <span class="task-title">{task_title}</span>\
        <span class="task-drag"><img src="img/drag.png"></span>\
    </div>';

function selectTask(projectId, taskId) {
    selectProject(projectId);
    selectedTask = taskId;
    $(".task.selected").removeClass("selected");
    $(taskIdPrefix + taskId).addClass("selected");
    uploadTaskToInfoBox();
    $("#info-box-wrapper").css("visibility", "visible");
}

function unselectTask() {
    selectedTask = undefined;
    $(".task.selected").removeClass("selected");
    $("#info-box-wrapper").css("visibility", "hidden");
}

function bindTaskCalls(projectId, taskId) {
    $(taskIdPrefix + taskId).click(function () {
        selectTask(projectId, taskId);
    });
}

function addTask(projectId, taskId) {
    const taskInfo = todo.tracker_info[selectedTracker].project_info[projectId].task_info[taskId];
    const taskHTML = newTaskHTML
        .replaceAll("{task_id}", taskIdPrefix.substring(1) + taskId)
        .replaceAll("{task_title}", taskInfo.title)
        .replaceAll("{task_status}", taskInfo.status);
    var taskBox = $(projectIdPrefix + projectId).find(".project-task-box");
    taskBox.find(".project-task-placeholder").css("visibility", "hidden");
    taskBox.append(taskHTML);
    bindTaskCalls(projectId, taskId);
}

function createNewTask(projectId, title = "Untitled task", status = "new") {
    const taskId = generateRandomId(10);
    var projectInfo = todo.tracker_info[selectedTracker].project_info[projectId];
    projectInfo.tasks.push(taskId);
    projectInfo.task_info[taskId] = { id: taskId, title: title, status: status, assignees: new Set([]), notes: {}, action_items: [], action_item_info: {} };
    addTask(projectId, taskId);
    selectTask(projectId, taskId);
    $("#item-title").focus();
}

function addTasks(projectId) {
    var taskIds = todo.tracker_info[selectedTracker].project_info[projectId].tasks;
    taskIds.forEach(id => {
        addTask(projectId, id);
    });
}

// -------------------------------------

// -------------------------------------
// INFO BOX

var notesEditor;
const assigneeIdPrefix = "#assignee-item_";
const actionItemIdPrefix = "#action-item_";
const statusToTextMap = { new: "New", in_progress: "In Progress", pending: "Pending", cancelled: "Cancelled", completed: "Completed" };

const newAssigneeHTML = '\
    <div class="item-assignee" id="{assignee_id}"> \
        <span class="item-assignee-value">{assignee}</span> \
        <span class="item-assignee-remove"><img src="img/remove.png"></span> \
    </div>';
const newActionItemHTML = '\
    <div class="action-item" id="{action_item_id}"> \
        <div class="action-item-checkbox"><img src="img/check.png"></div>\
        <textarea class="action-item-textarea" placeholder="What is my purpose?">{action_item_title}</textarea>\
        <div class="action-item-buttons">\
            <img class="action-item-archive" src="img/archive.png">\
            <img class="action-item-delete" src="img/trash.png">\
        </div>\
    </div>';

// Methods for task status {{{
function setTaskStatus(status) {
    $("#item-status-selected-option .item-field-image").attr("src", "img/status/" + status + ".png");
    $("#item-status-selected-option .item-status-option-text").text(statusToTextMap[status]);
    $(".task.selected .task-status img").attr("src", "img/status/" + status + ".png");
}
// }}}

// Methods for task assignees {{{
function removeTaskAssignee(assigneeId) {
    const assignee = $(assigneeIdPrefix + assigneeId + " .item-assignee-value").text();
    console.log(assignee);
    getActiveTaskInfo().assignees.delete(assignee);
    $(assigneeIdPrefix + assigneeId).remove();
}

function addTaskAssignee(assignee) {
    const assigneeId = generateRandomId(10);
    const assigneeHTML = newAssigneeHTML
        .replaceAll("{assignee_id}", assigneeIdPrefix.substring(1) + assigneeId)
        .replaceAll("{assignee}", assignee);
    $("#item-assignees-box").append(assigneeHTML);
    $(assigneeIdPrefix + assigneeId + " .item-assignee-remove").click(function () {
        removeTaskAssignee(assigneeId);
    });
}
// }}}

// Methods for task action items {{{
function deleteActionItem(actionItemId) {
    var taskInfo = getActiveTaskInfo()
    const idx = taskInfo.action_items.indexOf(actionItemId);
    if (idx > -1) {
        taskInfo.action_items.splice(idx, 1);
    }
    delete taskInfo.action_item_info[actionItemId]
    $(actionItemIdPrefix + actionItemId).remove();
}

function archiveActionItem(actionItemId) {
    var container = $(actionItemIdPrefix + actionItemId);
    if (container.hasClass("completed")) return;
    var archiveButton = container.find(".action-item-buttons .action-item-archive");
    var actionItemInfo = getActiveTaskInfo().action_item_info[actionItemId];
    container.toggleClass("archived");
    if (container.hasClass("archived")) {
        container.find("textarea").prop("disabled", true)
        archiveButton.prop("src", "img/restore.png");
        actionItemInfo.status = "archived";
    } else {
        container.find("textarea").prop("disabled", false)
        archiveButton.prop("src", "img/archive.png");
        actionItemInfo.status = "new";
    }
    $(actionItemIdPrefix + actionItemId).remove();
}

function completeActionItem(actionItemId) {
    var container = $(actionItemIdPrefix + actionItemId);
    if (container.hasClass("archived")) return;
    container.toggleClass("completed");
    var actionItemInfo = getActiveTaskInfo().action_item_info[actionItemId];
    if (container.hasClass("completed")) {
        actionItemInfo.status = "completed";
    } else {
        actionItemInfo.status = "new";
    }
    $(actionItemIdPrefix + actionItemId).remove();
};

function addActionItem(actionItemId) {
    const actionItemInfo = getActiveTaskInfo().action_item_info[actionItemId];
    if (actionItemInfo.status == "completed" || actionItemInfo.status == "archived") {
        return;
    }
    var actionItemHTML = newActionItemHTML
        .replaceAll("{action_item_id}", actionItemIdPrefix.substring(1) + actionItemId)
        .replaceAll("{action_item_title}", actionItemInfo.title);
    $("#action-items-list").append(actionItemHTML);

    var container = $(actionItemIdPrefix + actionItemId);
    var actionItemTextarea = container.find(".action-item-textarea");
    actionItemTextarea.on("click blur keyup paste input", function () {
        console.log($(this).prop("scrollHeight") + "px");
        actionItemInfo.title = $(this).val();
        $(this).css("height", 0);
        $(this).css("height", $(this).prop("scrollHeight") + "px");
    });
    actionItemTextarea.css("height", 0);
    console.log(actionItemTextarea.prop("scrollHeight") + "px");
    console.log(actionItemTextarea.text());
    actionItemTextarea.css("height", actionItemTextarea.prop("scrollHeight") + "px");
    container.find(".action-item-buttons .action-item-delete").click(function () {
        deleteActionItem(actionItemId);
    });
    container.find(".action-item-buttons .action-item-archive").click(function () {
        archiveActionItem(actionItemId);
    });
    container.find(".action-item-checkbox").click(function () {
        completeActionItem(actionItemId);
    });

    switch (actionItemInfo.status) {
        case "completed":
            completeActionItem(actionItemId);
            break;
        case "archived":
            archiveActionItem(actionItemId);
            break
        default:
            break;
    }
}

function createNewActionItem(title = "", status = "new") {
    const actionItemId = generateRandomId(10);
    var taskInfo = getActiveTaskInfo();
    taskInfo.action_items.push(actionItemId);
    taskInfo.action_item_info[actionItemId] = { id: actionItemId, title: "", status: "new" }
    addActionItem(actionItemId);
}
// }}}

// Methods for updating displaying info box details {{{
function uploadProjectToInfoBox() {
    const info = getActiveProjectInfo();
    $("#item-title").val(info.title);
    notesEditor.setContents(info.notes);
    notesEditor.history.clear();
    // Hide task specific items.
    $("#action-items-list").empty();
    $("#item-status").css("display", "none");
    $("#info-assignees").css("display", "none");
    $("#info-actions").css("display", "none");
}

function uploadTaskToInfoBox() {
    const info = getActiveTaskInfo();
    $("#item-title").val(info.title);
    setTaskStatus(info.status);
    $("#item-assignees-box").empty();
    $("#item-assignee-input").val("");
    info.assignees.forEach(assignee => {
        addTaskAssignee(assignee);
    });
    info.action_items.forEach(actionItemId => {
        addActionItem(actionItemId);
    });
    notesEditor.setContents(info.notes);
    notesEditor.history.clear();
    // Show task specific items.
    $("#item-status").css("display", "block");
    $("#info-assignees").css("display", "flex");
    $("#info-actions").css("display", "block");
}
// }}}

// Methods to bind actions to info box changes {{{
function getActiveInfoBoxSelection() {
    if (selectedProject == undefined) {
        return [undefined, undefined];
    }
    if (selectedTask == undefined) {
        return ["project", getActiveProjectInfo()];
    }
    return ["task", getActiveTaskInfo()];
}

function addInfoBoxFunctions() {
    // Shared items between project and task.
    $("#item-title").change(function () {
        var [type, info] = getActiveInfoBoxSelection();
        info.title = $(this).val();
        if (type == "task") {
            $(taskIdPrefix + selectedTask + " .task-title").text(info.title);
        }
        else if (type == "project") {
            $(projectIdPrefix + selectedProject + " .project-title").text(info.title);
        }
    });
    notesEditor.on("text-change", function () {
        getActiveInfoBoxSelection()[1].notes = notesEditor.getContents();
    });

    var deleteDialog = $("#delete-dialog-container");
    $("#delete-dialog-close-button").click(function () {
        deleteDialog.css("visibility", "hidden");
    });
    $("#delete-dialog-cancel-button").click(function () {
        deleteDialog.css("visibility", "hidden");
    });
    $("#delete-dialog-submit-button").click(function () {
        if (selectedTask != undefined) {
            var tasks = getActiveProjectInfo().tasks;
            const idx = tasks.indexOf(selectedTask);
            if (idx > -1) {
                tasks.splice(idx, 1);
            }
            delete getActiveTaskInfo();
            $(".task.selected").remove();
            unselectTask();
        } else if (selectedProject != undefined) {
            var projects = getActiveTrackerInfo().projects;
            const idx = projects.indexOf(selectedProject);
            if (idx > -1) {
                projects.splice(idx, 1);
            }
            delete getActiveProjectInfo();
            $(".project.selected").remove();
            unselectProject();
        }
        deleteDialog.css("visibility", "hidden");
    });
    $("#item-delete").click(function () {
        const [type, info] = getActiveInfoBoxSelection();
        deleteDialog.find(".modal-dialog-heading").text("Confirm delete " + type);
        deleteDialog.find("#delete-dialog-title").text(info.title);
        deleteDialog.css("visibility", "visible");
    });

    $("#item-assignee-input").keypress(function (e) {
        if (e.which == 13) {
            const assignee = $(this).val();
            var taskInfo = getActiveTaskInfo();
            if (!taskInfo.assignees.has(assignee)) {
                getActiveTaskInfo().assignees.add(assignee);
                addTaskAssignee(assignee);
            }
            $(this).val("");
        }
    });

    $("#action-items-add").click(createNewActionItem);
    var actionItemsListBox = $("#action-items-list");
    actionItemsListBox.sortable({
        // handle: ".action-item-drag",
        helper: "clone",
        opacity: 0.65,
        axis: "y",
        containment: "parent",
        cursor: "move",
        delay: 150,
        revert: 100,
        update: function (_event, _ui) {
            var actionItems = [];
            actionItemsListBox.children(".action-item").each(function () {
                actionItems.push($(this).attr("id").substring(actionItemIdPrefix.length - 1));
            });
            getActiveTaskInfo().action_items = actionItems.slice();
        }
    });

    const taskStatusDropdown = $("#item-status-dropdown");
    $("#item-status-dropdown .option").click(function () {
        const status = $(this).attr("data-value");
        setTaskStatus(status);
        getActiveTaskInfo().status = status;
    });
    document.addEventListener("click", (e) => {
        if ($("#item-status").has(e.target).length == 0) {
            taskStatusDropdown.removeClass("active");
        } else {
            taskStatusDropdown.toggleClass("active");
        }
    });
}
// }}}

// -------------------------------------

function getTodoString() {
    return JSON.stringify(
        todo,
        (_key, value) => (value instanceof Set ? [...value] : value)
    );
}

function fromTodoString(todoString) {
    todo = JSON.parse(
        todoString,
        (key, value) => (key == "assignees" ? new Set(value) : value)
    );
}

var todoFileHandle;
var saverInterval;

async function verifyPermission(readWrite = true) {
    const options = {};
    if (readWrite) {
        options.mode = 'readwrite';
    }
    if ((await todoFileHandle.queryPermission(options)) === 'granted') {
        return true;
    }
    if ((await todoFileHandle.requestPermission(options)) === 'granted') {
        return true;
    }
    return false;
}

async function writeFile() {
    if (todoFileHandle == undefined) return;
    verifyPermission(todoFileHandle);
    const writable = await todoFileHandle.createWritable();
    await writable.write(getTodoString());
    await writable.close();
    console.log("Saved to todo file");
}

async function loadTodoFromHandler(ignoreErrors = false) {
    try {
        const file = await todoFileHandle.getFile();
        const contents = await file.text();

        console.log(file);
        console.log("Read data from file: ", file.name, ". Content: ", contents);
        fromTodoString(contents);
    } catch (error) {
        todoFileHandle = undefined;
        console.log("Error reading or parsing TODO file: ", error);
        if (!ignoreErrors) {
            alert("Error reading the TODO file. Please correct any issues in the file.");
        }
        return;
    };

    verifyPermission(todoFileHandle);
    console.log("Parsed todo: ", todo);

    clearTrackers();
    todo.trackers.forEach(trackerId => {
        addTracker(trackerId);
    });
    if (todo.trackers.length > 0) {
        selectTracker(todo.trackers[0]);
    }
    await set('file', todoFileHandle)
        .catch((err) => console.log('Failed to !', err));
    $(".importer").css("visibility", "hidden");

    saverInterval = setInterval(writeFile, 5000);
};

async function tryLoadingLastFile() {
    await get('file')
        .then(function (handle) {
            console.log('Read file from index DB: ', handle.name);
            todoFileHandle = handle;
        })
        .catch(function (err) {
            console.log('Failed to read the file from index DB: ', err);
        });
    if (todoFileHandle == undefined) {
        console.log("Error reading file from key-value store. Please re-import it.");
        return;
    }
    loadTodoFromHandler(true);
}

async function saveToNewFile() {
    const options = {
        suggestedName: "todo.json",
        types: [
            {
                description: 'Create your new TODO file',
                accept: {
                    'text/plain': ['.json'],
                },
            },
        ],
    };
    todoFileHandle = await window.showSaveFilePicker(options);
    verifyPermission();
    writeFile();
    await set('file', todoFileHandle);

    saverInterval = setInterval(writeFile, 5000);
}

$(document).ready(function () {
    const toolbarOptions = [
        ['bold', 'italic', 'underline', 'strike', { 'color': [] }, { 'align': [] }],
        ['link', 'image', 'formula'],
        ['blockquote', 'code-block'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'list': 'check' }],
        [{ 'indent': '-1' }, { 'indent': '+1' }],          // outdent/indent
        [{ 'script': 'sub' }, { 'script': 'super' }],      // superscript/subscript
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        [{ 'font': [] }],
    ];

    notesEditor = new Quill('#notes-editor', {
        theme: "snow",
        placeholder: "Your notes go here ...",
        modules: {
            toolbar: toolbarOptions
        }
    });

    addTrackerFunctions();
    addProjectFunctions();
    addInfoBoxFunctions();

    $(".read-todo-file").click(async function () {
        const [fileHandle] = await window.showOpenFilePicker();
        todoFileHandle = fileHandle;
        loadTodoFromHandler();
    });
    $(".create-todo-file").click(saveToNewFile);
    tryLoadingLastFile();
});
