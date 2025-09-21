const api = (act, data = {}) =>
    $.ajax({
        url: '?action=' + encodeURIComponent(act),
        method: 'POST',
        data,
        dataType: 'json'
    });


const apiGet = (act, params = {}) => $.getJSON('?action=' + encodeURIComponent(act), params);

$(document).on('click', '#switchProjectBtn', function () {
    apiGet('projects:list').then(r => {
        if (window.showProjectChooser) window.showProjectChooser(r.data || []);
    });
});

function loadProjects() {
    return apiGet('projects:list').then(r => {
        const sel = $('#project').empty();
        r.data.forEach(p => sel.append(`<option value="${p.id}">${p.name}</option>`));
    }).then(() => {
        loadAreas();
        loadIterations();
        loadTree();
        loadBoard();
        loadColumns();
        loadKanbanIterations();
        renderCurrentProjectBar(); // new
    });
}

function loadKanbanIterations() {
    const pid = $('#project').val();
    if (!pid) return;

    // Support either id in the HTML
    const $sel = $('#kanbanIteration, #kanbanIterations');
    if (!$sel.length) { console.warn('Kanban iteration select not found'); return; }

    const prev = $sel.val() || '';

    return apiGet('iterations:list', { project_id: pid }).then(r => {
        $sel.empty();
        // console.log('Kanban iterations loaded:', (r.data || []).length);
        (r.data || []).forEach(it => $sel.append(`<option value="${it.id}">${escapeHtml(it.path)}</option>`));

        // try to restore previous selection if still valid
        if (prev && $sel.find(`option[value="${prev}"]`).length) {
            $sel.val(prev);
        }
    }).catch(err => {
        console.error('iterations:list failed', err);
    });
}

function loadAreas() {
    const pid = $('#project').val();
    if (!pid) return;
    return apiGet('areas:list', {
        project_id: pid
    }).then(r => {
        const sel = $('#area').empty().append('<option value="">(Any)</option>');
        r.data.forEach(a => sel.append(`<option value="${a.id}">${a.name}</option>`));
    });
}

function loadIterations() {
    const pid = $('#project').val();
    if (!pid) return;
    return apiGet('iterations:list', {
        project_id: pid
    }).then(r => {
        const sel = $('#iteration').empty().append('<option value="">(Any)</option>');
        r.data.forEach(it => sel.append(`<option value="${it.id}">${it.path}</option>`));
    });
}

// Backlog Tree
function loadTree() {
    const pid = $('#project').val();
    if (!pid) return;

    const collapsedKey = (pid) => `agile_tree_collapsed_${pid}`;
    const getCollapsedSet = (pid) => new Set(JSON.parse(localStorage.getItem(collapsedKey(pid)) || '[]'));
    const setCollapsedSet = (pid, set) => localStorage.setItem(collapsedKey(pid), JSON.stringify(Array.from(set)));
    const collapsed = getCollapsedSet(pid);

    apiGet('items:tree', {
        project_id: pid
    }).then(r => {
        const rootDiv = $('#tree').empty();

        // Seed default collapsed state to Epic level on first load for this project
        const mode = 'epics';
        if (mode === 'epics' && collapsed.size === 0) {
            (r.data || []).forEach(n => collapsed.add(String(n.id)));
            setCollapsedSet(pid, collapsed);
        }
        const renderNode = (n) => {
            const hasChildren = n.children && n.children.length > 0;
            const isCollapsed = collapsed.has(n.id.toString());
            const badge = `<span class="badge bg-${typeColor(n.type)}">${n.type.replace('_', ' ')}</span>`;
            const caret = hasChildren
                ? `<span class="twisty ${isCollapsed ? 'collapsed' : ''}" data-id="${n.id}" title="Toggle">${isCollapsed ? '▸' : '▾'}</span>`
                : `<span class="twisty placeholder">•</span>`;

            const canHaveChild = n.type !== 'task'; // epic/feature/user_story only
            const addChildBtn = canHaveChild ? '<button class="btn btn-outline-success btn-add-child">+ Child</button>' : '';

            // Story Points badge for user_story
            const spBadge = (n.type === 'user_story' && n.story_points != null && n.story_points !== '')
                ? `<span class="badge bg-primary ms-2">SP: ${n.story_points}</span>`
                : '';

            // Add data-parent and data-desc attributes
            const line = $(`
                            <div class="wi"
                                data-id="${n.id}"
                                data-type="${n.type}"
                                data-project="${n.project_id}"
                                data-area="${n.area_id || ''}"
                                data-iteration="${n.iteration_id || ''}"
                                data-parent="${n.parent_id || ''}"
                                data-points="${n.story_points ?? ''}"
                                data-desc="${(n.description || '').replace(/"/g, '&quot;')}">
                                ${caret}
                                ${badge}
                                <span contenteditable class="editable" data-id="${n.id}">${escapeHtml(n.title)}</span>
                                <span class="small-muted">[${n.status}]</span> ${spBadge}
                                <div class="ms-auto btn-group btn-group-sm">
                                ${n.type === 'task' ? '<button class="btn btn-outline-light btn-time">Time</button>' : ''}

                                ${addChildBtn}
                                <button class="btn btn-outline-light btn-del">Del</button>
                                </div>
                            </div>
                            `);
            line.attr('data-title', (n.title || '').toLowerCase());

            const li = $('<li></li>').append(line);
            const ul = $('<ul class="sortable-siblings"></ul>');
            if (hasChildren) {
                n.children.forEach(c => ul.append(renderNode(c)));
            }
            if (isCollapsed) {
                ul.hide();
            }
            li.append(ul);
            return li;
        };



        const ul = $('<ul class="sortable-siblings"></ul>');
        r.data.forEach(n => ul.append(renderNode(n)));
        rootDiv.append(ul);

        // Sortable (still global reorder; see item 3 to improve)
        $(".sortable-siblings").sortable({
            connectWith: '.sortable-siblings',
            placeholder: 'ui-state-highlight',
            stop: function (event, ui) {
                const parentUl = ui.item.parent();
                const parentId = parentUl.closest('li').find('> .wi').data('id') || '';
                const ids = parentUl.children('li').map(function () {
                    return $(this).find('.wi').data('id');
                }).get();
                api('items:reorder', { parent_id: parentId, ids });
            }
        }).disableSelection();

        // Rebind delegated handlers once (avoid duplicates)
        $('#tree').off('blur', '.editable').on('blur', '.editable', function () {
            const id = $(this).data('id');
            api('items:update', {
                id,
                title: $(this).text()
            });
        });
        $('#tree').off('click', '.btn-del').on('click', '.btn-del', function () {
            const id = $(this).closest('.wi').data('id');
            if (confirm('Delete item #' + id + ' and its children?')) api('items:delete', {
                id
            }).then(loadTree);
        });
        $('#tree').off('click', '.btn-time').on('click', '.btn-time', function () {
            const id = $(this).closest('.wi').data('id');
            $('#tmTaskId').text(id);
            $('#tmTaskIdInput').val(id);
            loadUsersInto('#tmUser');
            loadTime(id);
            new bootstrap.Modal('#timeModal').show();
        });
        $('#tree')
            .off('click.addchild', '.btn-add-child')
            .on('click.addchild', '.btn-add-child', function () {
                const $wi = $(this).closest('.wi');
                const id = $wi.data('id');
                const type = String($wi.data('type'));
                const pid = $wi.data('project') || '';
                const aid = $wi.data('area') || '';
                const iid = $wi.data('iteration') || '';

                const suggested = childTypeOf[type];
                if (!suggested) return; // tasks don't have children

                // Clear edit mode when creating a child
                $('#createItem').removeData('edit-id').text('Create');

                // Prefill form (editable)
                $('#newParent').val(id);
                $('#newType').val(suggested);
                $('#newTitle').val('');
                if ($('#newDesc').summernote) $('#newDesc').summernote('code', ''); else $('#newDesc').val('');
                $('#newPoints').val('');         // <-- add
                toggleStoryPoints();             // <-- ensure visibility matches suggested type
                if (pid) $('#project').val(String(pid)); // set without triggering global change

                // Load area/iteration options for this project, then set defaults to inherit
                fillAreasAndIterationsFor(pid, aid, iid).then(() => {
                    // open the offcanvas
                    const off = new bootstrap.Offcanvas('#offcanvasWorkItem');
                    off.show();
                    // focus title for fast typing
                    setTimeout(() => $('#newTitle').trigger('focus'), 150);
                });
            });

        // Double-click to edit work item in offcanvas
        $('#tree')
            .off('dblclick.edit', '.wi')
            .on('dblclick.edit', '.wi', function () {
                const $wi = $(this);
                const id = $wi.data('id');
                const type = String($wi.data('type'));
                const pid = $wi.data('project') || '';
                const aid = $wi.data('area') || '';
                const iid = $wi.data('iteration') || '';
                const parentId = $wi.data('parent') || '';
                const title = $wi.find('.editable').text();
                const desc = $wi.data('desc') || '';

                const points = $wi.data('points') || '';
                $('#newPoints').val(points);

                // Put form into EDIT mode
                $('#createItem').data('edit-id', id).text('Save Changes');

                // Prefill fields (editable)
                $('#newParent').val(parentId);
                $('#newType').val(type);
                $('#newTitle').val(title);
                toggleStoryPoints();

                if ($('#newDesc').summernote) $('#newDesc').summernote('code', desc); else $('#newDesc').val(desc);

                if (pid) $('#project').val(String(pid));

                // Ensure area/iteration dropdowns are loaded for this project and inherit values
                fillAreasAndIterationsFor(pid, aid, iid).then(() => {
                    const off = new bootstrap.Offcanvas('#offcanvasWorkItem');
                    off.show();
                    setTimeout(() => $('#newTitle').trigger('focus'), 150);
                });

                // (Optional) Try to fetch freshest description if API supports it
                if (typeof apiGet === 'function') {
                    apiGet('items:get', { id }).then(r => {
                        if (r && r.ok && r.data) {
                            const fresh = r.data.description || '';
                            if ($('#newDesc').summernote) $('#newDesc').summernote('code', fresh); else $('#newDesc').val(fresh);
                            $('#newPoints').val(r.data.story_points || '');   // <-- add this
                            toggleStoryPoints();


                        }
                    }).catch(() => { });
                }
            });

        $('#tree').off('click', '.twisty').on('click', '.twisty', function () {
            if ($(this).hasClass('placeholder')) return;
            const id = $(this).data('id').toString();
            const childUl = $(this).closest('li').children('ul.sortable-siblings');
            if (childUl.is(':visible')) {
                childUl.slideUp(120);
                $(this).addClass('collapsed').text('▸');
                collapsed.add(id);
            } else {
                childUl.slideDown(120);
                $(this).removeClass('collapsed').text('▾');
                collapsed.delete(id);
            }
            setCollapsedSet(pid, collapsed);
        });


    });
}

// Map parent -> suggested child type
const childTypeOf = { epic: 'feature', feature: 'user_story', user_story: 'task' };

// Fill Areas & Iterations for a specific project (without global project change side-effects)
function fillAreasAndIterationsFor(pid, areaId, iterId) {
    return $.when(
        apiGet('areas:list', { project_id: pid }),
        apiGet('iterations:list', { project_id: pid })
    ).then((ar, ir) => {
        const areas = ar[0].data || [];
        const iters = ir[0].data || [];
        const $area = $('#area').empty();
        const $iter = $('#iteration').empty();
        areas.forEach(a => $area.append(`<option value="${a.id}">${escapeHtml(a.name)}</option>`));
        iters.forEach(i => $iter.append(`<option value="${i.id}">${escapeHtml(i.path)}</option>`));
        if (areaId) $area.val(String(areaId));
        if (iterId) $iter.val(String(iterId));
    });
}


// Expand/Collapse all buttons
$('#expandAll').on('click', function () {
    const pid = $('#project').val();
    if (!pid) return;
    localStorage.setItem(`agile_tree_collapsed_${pid}`, JSON.stringify([]));
    $('#tree ul.sortable-siblings').slideDown(120);
    $('#tree .twisty').removeClass('collapsed').not('.placeholder').text('▾');
});
$('#collapseAll').off('click').on('click', function () {
    const pid = $('#project').val(); if (!pid) return;

    // Keep the root list visible
    $('#tree > ul.sortable-siblings').show();

    const collapsedIds = [];

    // For each top-level item (Epics), collapse only their child lists
    $('#tree > ul.sortable-siblings > li').each(function () {
        const $li = $(this);
        const $wi = $li.children('.wi');
        const id = String($wi.data('id') || '');

        const $childUl = $li.children('ul.sortable-siblings');
        if ($childUl.length) {
            $childUl.slideUp(120);
            $wi.find('> .twisty').addClass('collapsed').text('▸');
            collapsedIds.push(id);
        }
    });

    // Persist collapsed state (only epics marked collapsed)
    localStorage.setItem(`agile_tree_collapsed_${pid}`, JSON.stringify(collapsedIds));
});

function typeColor(t) {
    return {
        epic: 'danger',
        feature: 'warning',
        user_story: 'info',
        task: 'success'
    }[t] || 'secondary';
}

// Create work item
// $('#createItem').on('click', function () {
//     const payload = {
//         type: $('#newType').val(),
//         title: $('#newTitle').val(),
//         description: $('#newDesc').val(),
//         parent_id: $('#newParent').val() || '',
//         project_id: $('#project').val(),
//         area_id: $('#area').val() || '',
//         iteration_id: $('#iteration').val() || ''
//     };
//     api('items:create', payload).then(() => {
//         $('#newTitle').val('');
//         $('#newDesc').val('');
//         loadTree();
//         loadBoard();
//     });
// });

function toggleStoryPoints() {
    const isStory = $('#newType').val() === 'user_story';
    $('#storyPointsWrap').toggleClass('d-none', !isStory);
    if (!isStory) $('#newPoints').val('');
}
$(document).on('change', '#newType', toggleStoryPoints);
$(function () { toggleStoryPoints(); });

$('#createItem').off('click.create').on('click.create', function (e) {
    e.preventDefault();
    const isStory = $('#newType').val() === 'user_story';
    const editId = $('#createItem').data('edit-id');
    const payload = {
        type: $('#newType').val(),
        title: $('#newTitle').val(),
        description: ($('#newDesc').summernote ? $('#newDesc').summernote('code') : $('#newDesc').val()), parent_id: $('#newParent').val() || '',
        project_id: $('#project').val(),
        area_id: $('#area').val() || '',
        iteration_id: $('#iteration').val() || '',
        story_points: isStory ? ($('#newPoints').val() || '') : ''  // <-- add this

    };

    // Basic validation before sending
    if (!payload.project_id) return alert('Please select a Project.');
    if (!payload.type) return alert('Please choose a work item type.');
    if (!payload.title) return alert('Please enter a title.');

    if (editId) {
        // UPDATE existing item
        api('items:update', Object.assign({ id: editId }, payload))
            .then((r) => {
                if (!r || !r.ok) return alert((r && r.msg) || 'Failed to update work item.');
                // Success: exit edit mode
                $('#createItem').removeData('edit-id').text('Create');
                loadTree();
                loadBoard();
            })
            .catch((xhr) => alert((xhr && xhr.responseText) || 'Request failed.'));
    } else {
        // CREATE new item
        api('items:create', payload)
            .then((r) => {
                if (!r || !r.ok) return alert((r && r.msg) || 'Failed to create work item.');
                $('#newTitle').val('');
                if ($('#newDesc').summernote) $('#newDesc').summernote('code', ''); else $('#newDesc').val('');
                $('#newPoints').val('');         // <-- add
                toggleStoryPoints();             // <-- ensure visibility matches suggested type
                $('#newParent').val('');
                loadTree();
                loadBoard();
            })
            .catch((xhr) => alert((xhr && xhr.responseText) || 'Request failed.'));
    }
});



$('#refreshTree').on('click', loadTree);

$('#addProject').on('click', () => {
    const n = prompt('Project name');
    if (n) api('projects:create', {
        name: n
    }).then(loadProjects);
});
$('#addArea').on('click', () => {
    const n = prompt('Area name');
    if (n) api('areas:create', {
        project_id: $('#project').val(),
        name: n
    }).then(loadAreas);
});
$('#addIteration').on('click', () => {
    const path = prompt('Iteration path (e.g. 2025/Sprint-1)');
    if (path) api('iterations:create', {
        project_id: $('#project').val(),
        path
    }).then(() => {
        loadIterations();
        loadKanbanIterations();
    });
});

// Users dropdown for time modal
function loadUsersInto(sel) {
    return apiGet('users:list').then(r => {
        const s = $(sel).empty();
        r.data.forEach(u => s.append(`<option value="${u.id}">${u.name}</option>`));
    });
}

// Time table
function loadTime(taskId) {
    apiGet('time:list', {
        task_id: taskId
    }).then(r => {
        const wrap = $('#timeTable').empty();
        const rows = r.data.map(t => `<tr><td>${t.entry_date}</td><td>${escapeHtml(t.user_name)}</td><td>${t.hours}</td><td>${escapeHtml(t.notes || '')}</td><td><button class="btn btn-sm btn-outline-light" data-del="${t.id}">Del</button></td></tr>`).join('');
        wrap.html(`<table class="table table-sm table-dark"><thead><tr><th>Date</th><th>User</th><th>Hours</th><th>Notes</th><th></th></tr></thead><tbody>${rows}</tbody></table>`);
        wrap.find('[data-del]').on('click', function () {
            api('time:delete', {
                id: $(this).data('del')
            }).then(() => loadTime(taskId));
        })
    });
}

$('#timeForm').on('submit', function (e) {
    e.preventDefault();
    const fd = $(this).serialize();
    api('time:add', fd).then(() => {
        loadTime($('#tmTaskIdInput').val());
        this.reset();
    });
});

// Kanban
function loadColumns() {
    const pid = $('#project').val();
    apiGet('kanban:columns:list', pid ? { project_id: pid } : {})
        .then(r => {
            const ul = $('#columnsList').empty();

            r.data.forEach(c => {
                const li = $(`
          <li class="list-group-item d-flex align-items-center gap-2">
            <input class="form-control form-control-sm col-name" style="max-width: 240px"
                   value="${escapeHtml(c.name)}" data-id="${c.id}">
            <input class="form-control form-control-sm col-order" type="number" style="width: 90px"
                   value="${c.order_index}" data-id="${c.id}" title="Order">
            <div class="ms-auto btn-group btn-group-sm">
              <button class="btn btn-outline-primary" data-save="${c.id}">Save</button>
              <button class="btn btn-outline-danger" data-del="${c.id}">Delete</button>
            </div>
          </li>
        `);
                ul.append(li);
            });

            // Delete
            ul.off('click', '[data-del]').on('click', '[data-del]', function () {
                const id = $(this).data('del');
                if (confirm('Delete column #' + id + '?')) {
                    api('kanban:columns:delete', { id }).then(() => { loadColumns(); loadBoard(); });
                }
            });

            // Save (button)
            ul.off('click', '[data-save]').on('click', '[data-save]', function () {
                const id = $(this).data('save');
                const row = $(this).closest('li');
                const name = row.find('.col-name').val();
                const order_index = row.find('.col-order').val();
                if (!name.trim()) return alert('Name cannot be empty.');
                api('kanban:columns:update', { id, name, order_index })
                    .then(r => {
                        if (!r.ok) return alert(r.msg || 'Update failed');
                        loadColumns();
                        loadBoard(); // reflect new column name instantly
                    })
                    .catch(xhr => alert((xhr && xhr.responseText) || 'Request failed.'));
            });

            // Save on Enter inside inputs
            ul.off('keydown', '.col-name, .col-order').on('keydown', '.col-name, .col-order', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    $(this).closest('li').find('[data-save]').click();
                }
            });

            // Optional: save on blur of name field
            ul.off('blur', '.col-name').on('blur', '.col-name', function () {
                const row = $(this).closest('li');
                row.find('[data-save]').click();
            });
        });
}
$('#addColumnForm').on('submit', function (e) {
    e.preventDefault();
    const pid = $('#project').val() || '';
    const data = $(this).serialize() + `&project_id=${pid}`;
    api('kanban:columns:add', data).then(() => {
        this.reset();
        loadColumns();
        loadBoard();
    });
});

function loadBoard() {
    const pid = $('#project').val();
    if (!pid) return;
    const iter = $('#kanbanIteration, #kanbanIterations').val() || '';
    const mode = iter ? 'stories' : 'stories';
    apiGet('kanban:board', {
        project_id: pid,
        iteration_id: iter,
        mode
    }).then(r => {
        const kan = $('#kanban').empty();
        const isStoryMode = mode === 'stories';
        
        if (r.data.columns.length > 0) {
            r.data.columns.forEach(col => {
                const colDiv = $(`
                    <div class="kanban-col card">
                        <div class="col-head"><strong>${escapeHtml(col)}</strong></div>
                        <div class="dropzone" data-status="${col}"></div>
                    </div>
                `);
                kan.append(colDiv);
                const dz = colDiv.find('.dropzone');

                // if (isStoryMode) {
                //     // STORY MODE: render stories with nested tasks
                (r.data.stories[col] || []).forEach(s => dz.append(renderStoryCard(s)));
                // } else {
                //     // TASK MODE: original behavior
                //     (r.data.tasks[col] || []).forEach(t => dz.append(renderCard(t)));
                // }
            });
            // Set grid columns to fill 100% width
            const colCount = r.data.columns.length;
            $('#kanban').css('grid-template-columns', `repeat(${colCount}, 1fr)`);

            // Size the board to fill remaining viewport height
            // sizeKanban();
            // Drag/drop: move the card status (works for stories in story mode OR tasks in task mode)
            $(".kanban-card").draggable({
                revert: 'invalid',
                containment: 'document',
                zIndex: 1000
            });
            $(".dropzone").droppable({
                accept: '.kanban-card',
                drop: function (e, ui) {
                    const id = ui.draggable.data('id');
                    const status = $(this).data('status');
                    api('kanban:move', {
                        id,
                        status
                    }).then(loadBoard);
                }
            });

            // Size the board to fill remaining viewport height
            sizeKanban();
        }

    });
}

function sizeKanban() {
    const $kan = $('#kanban');
    const $kan2 = $('#tab-kanban');
    const $Nav = $('.navbar');
    if (!$kan.length) return;
    const navig = $Nav.height();                 // distance from top of viewport
    const top = $kan2.height();                 // distance from top of viewport
    const paddingBottom = 250;                      // a little breathing room
    const h = Math.max(200, window.innerHeight - paddingBottom - navig);
    $kan.css('height', h + 'px');
    $('.kanban-col').css('overflow-y', 'scroll');
}

// Recompute on resize and after board loads
$(window).on('resize', sizeKanban);

function renderCard(t) {
    return $(`<div class="kanban-card card mb-2 p-2" data-id="${t.id}"><div class="small-muted">#${t.id} • ${t.type}</div><div><strong>${escapeHtml(t.title)}</strong></div></div>`);
}

function renderStoryCard(s) {
    const storyId = s.id;
    const collapseId = `story-tasks-${storyId}`;

    const descHtml = (s.description || '').trim();
    const desc = descHtml ? `<div class="small-muted mt-1">${sanitizeHtmlBasic(descHtml)}</div>` : '';

    const sp = (s.story_points != null && s.story_points !== '') ? Number(s.story_points) : null;
    const spBadge = sp != null ? `<span class="badge bg-primary ms-2">SP: ${sp}</span>` : '';

    const taskItems = (s.tasks || []).map(t => {
        const badge = `<span class="badge bg-secondary ms-1">${escapeHtml(t.status || '')}</span>`;
        return `<li class="list-group-item d-flex justify-content-between align-items-start">
                <span>${escapeHtml(t.title || '')}</span>
                ${badge}
              </li>`;
    }).join('');

    const tasksList = `<ul class="list-group list-group-flush">${taskItems || '<li class="list-group-item small-muted">(No tasks)</li>'}</ul>`;

    return $(`
        <div class="kanban-card card mb-2" data-id="${storyId}">
          <div class="p-2 d-flex align-items-center justify-content-between">
            <div class="container">
                <div class="row">
                <div class="fw-semibold">${escapeHtml(s.title)} ${spBadge}</div>
                ${desc}
                </div>
                <div class="row">
                <button class="btn btn-sm btn-outline-light" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}" aria-expanded="false" aria-controls="${collapseId}">Toggle tasks</button>
                </div>
            </div>
          </div>
          <div id="${collapseId}" class="collapse">
            ${tasksList}
          </div>
        </div>
      `);
}
// Settings
$('#runSetup').on('click', () => apiGet('setup').then(() => alert('Setup complete')));
$('#seedUsers').on('click', () => {
    Promise.all([
        api('users:create', {
            name: 'Alice'
        }),
        api('users:create', {
            name: 'Bob'
        }),
        api('users:create', {
            name: 'Chloe'
        })
    ]).finally(() => alert('Seeded (duplicates ignored if unique not enforced).'));
});

// Utils
function escapeHtml(s) {
    return (s || '').replace(/[&<>\"']/g, m => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#39;"
    }[m]));
}
function sanitizeHtmlBasic(html) {
    if (!html) return '';
    html = html.replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
    html = html.replace(/ on[a-z]+="[^"]*"/gi, '')
        .replace(/ on[a-z]+='[^']*'/gi, '')
        .replace(/javascript:/gi, '');
    return html;
}
//kanban
$('#project').on('change', () => {
    renderCurrentProjectBar();  // <<< add this
    loadAreas();
    loadIterations();
    loadKanbanIterations();
    loadTree();
    loadBoard();
    loadColumns();
});
// Init
$('#kanbanIteration, #kanbanIterations').on('change', loadBoard);

$(function () {
    const SESSION_PROJECT_KEY = 'agile_session_project';

    function showProjectChooser(projects) {
        // Build chooser modal once
        let $modal = $('#projectChooserModal');
        if (!$modal.length) {
            $modal = $(
                '<div class="modal fade" id="projectChooserModal" tabindex="-1">\n' +
                '  <div class="modal-dialog modal-dialog-centered">\n' +
                '    <div class="modal-content">\n' +
                '      <div class="modal-header">\n' +
                '        <h5 class="modal-title">Choose a Project</h5>\n' +
                '        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>\n' +
                '      </div>\n' +
                '      <div class="modal-body">\n' +
                '        <div class="list-group" id="projectChooserList"></div>\n' +
                '      </div>\n' +
                '    </div>\n' +
                '  </div>\n' +
                '</div>'
            );
            $('body').append($modal);
        }

        const $list = $('#projectChooserList').empty();
        projects.forEach(p => {
            const btn = $(
                `<button type="button" class="list-group-item list-group-item-action" data-id="${p.id}">${escapeHtml(p.name)}</button>`
            );
            $list.append(btn);
        });

        $list.off('click', 'button').on('click', 'button', function () {
            const id = String($(this).data('id'));
            sessionStorage.setItem(SESSION_PROJECT_KEY, id);
            $('#project').val(id).trigger('change');
            const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('projectChooserModal'));
            modal.hide();
        });

        bootstrap.Modal.getOrCreateInstance(document.getElementById('projectChooserModal')).show();
    }

    window.showProjectChooser = showProjectChooser;

    loadProjects().then(() => {
        // After projects are loaded into the select, decide default for this session
        apiGet('projects:list').then(r => {
            const list = r.data || [];
            if (!list.length) {
                const n = prompt('Create a Project to start (e.g. SynthoSphere)');
                if (n) api('projects:create', { name: n }).then(loadProjects);
                return;
            }

            const saved = sessionStorage.getItem(SESSION_PROJECT_KEY);

            // If saved session project still exists, select it
            if (saved && list.some(p => String(p.id) === saved)) {
                $('#project').val(saved).trigger('change');
                return;
            }

            // If only one project, auto-select it for this session
            if (list.length === 1) {
                const onlyId = String(list[0].id);
                sessionStorage.setItem(SESSION_PROJECT_KEY, onlyId);
                $('#project').val(onlyId).trigger('change');
                return;
            }

            // Otherwise, ask the user which to use for this session
            showProjectChooser(list);
        });
    });
});

// Theme toggle
function applyTheme(theme) {
    if (theme === 'dark') {
        $('body').addClass('dark');
        $('#themeToggle').text('☀️');
    } else {
        $('body').removeClass('dark');
        $('#themeToggle').text('🌙');
    }
    localStorage.setItem('agile_theme', theme);
}

$('#themeToggle').on('click', function () {
    const isDark = $('body').hasClass('dark');
    applyTheme(isDark ? 'light' : 'dark');
});

// Init from localStorage
$(function () {
    const saved = localStorage.getItem('agile_theme') || 'light';
    applyTheme(saved);
});

$(function () {
    const offEl = document.getElementById('offcanvasWorkItem');
    if (offEl) {
        const off = new bootstrap.Offcanvas(offEl);
        $('#openWorkItem').off('click.openOff').on('click.openOff', function (e) {
            e.preventDefault();
            off.show();
            $('#createItem').removeData('edit-id').text('Create');
        });
    }
});


(function () {
    function modeKey(pid) { return 'agile_tree_mode_' + pid; }
    function getMode(pid) { return localStorage.getItem(modeKey(pid)) || 'epics'; }
    function setMode(pid, m) { localStorage.setItem(modeKey(pid), m); }
    function thresholdFor(mode) {
        if (mode === 'epics') return 0;
        if (mode === 'features') return 1;
        if (mode === 'stories') return 2;
        if (mode === 'all') return 99;
        return 0; // all expanded
    }
    function inferDepth($wi) {
        const uls = $wi.parentsUntil('#tree', 'ul');
        return Math.max(0, uls.length - 1);
    }
    $(document).on('applyTreeMode', applyTreeMode);
    function applyTreeMode() {
        const pid = $('#project').val(); if (!pid) return;
        const current = $('#treeViewMode').val() || getMode(pid);
        const th = thresholdFor(current);
        $('#treeViewMode').val(current);

        const collapsedIds = [];
        $('#tree .wi').each(function () {
            const $wi = $(this);
            const $li = $wi.closest('li');
            const keepOpen = $wi.hasClass('search-keep') || $li.hasClass('search-keep'); // <-- add this

            const depth = parseInt($wi.attr('data-depth') ?? inferDepth($wi), 10) || 0;
            $wi.attr('data-depth', depth);
            const $childUl = $li.children('ul.sortable-siblings');
            if ($childUl.length) {
                const $twisty = $li.children('.wi').find('> .twisty');
                if (!keepOpen && depth >= th) {             // <-- respect search keep-open
                    $childUl.hide();
                    $twisty.addClass('collapsed').text('▸');
                    collapsedIds.push(String($wi.data('id')));
                } else {
                    $childUl.show();
                    $twisty.removeClass('collapsed').text('▾');
                }
            }
        });
        localStorage.setItem('agile_tree_collapsed_' + pid, JSON.stringify(collapsedIds));
    }

    $(function () {
        // Dropdown change
        $(document).on('change', '#treeViewMode', function () {
            const pid = $('#project').val();
            const val = $(this).val();
            if (pid) setMode(pid, val);
            // Do NOT reload the tree; just re-apply mode on the current DOM
            setTimeout(applyTreeMode, 0);
        });

        // When project changes, sync dropdown + apply
        $(document).on('change', '#project', function () {
            const pid = $('#project').val();
            if (pid) {
                const key = modeKey(pid);
                if (!localStorage.getItem(key)) localStorage.setItem(key, 'epics'); // <-- seed default
                $('#treeViewMode').val(getMode(pid));
            }
            setTimeout(applyTreeMode, 60);
        });

        // Auto-apply after loadTree renders
        if (typeof window.loadTree === 'function') {
            const _orig = window.loadTree;
            window.loadTree = function () {
                const ret = _orig.apply(this, arguments);
                setTimeout(applyTreeMode, 60);
                return ret;
            };
        }
        // Initial apply
        setTimeout(applyTreeMode, 200);
    });
})();


(function () {
    function applySearch() {
        const q = ($('#treeSearch').val() || '').trim().toLowerCase();
        const pid = $('#project').val(); if (!pid) return;

        // clear previous marks
        $('#tree .wi').removeClass('search-keep');
        $('#tree li').removeClass('search-keep');

        if (!q) {
            // show everything again
            $('#tree li').show();
            $('#tree ul.sortable-siblings').show();
            // Re-apply current mode without reloading the tree
            $(document).trigger('applyTreeMode');
            return;
        }

        // Hide all, then reveal matches + ancestors
        $('#tree li').hide();
        $('#tree ul.sortable-siblings').hide();

        $('#tree .wi').each(function () {
            const $wi = $(this);
            const id = String($wi.data('id') || '');
            const title = String($wi.data('title') || '');   // from render
            const type = String($wi.data('type') || '');
            const status = String($wi.find('.small-muted').text() || '').toLowerCase();

            // Clean, stable haystack: title + #id + type + status
            const hay = `${title} #${id} ${type} ${status}`;

            if (hay.indexOf(q) !== -1) {
                const $li = $wi.closest('li');

                // mark this row + its ancestors to be kept open
                $wi.addClass('search-keep');
                $li.addClass('search-keep');
                $li.parentsUntil('#tree', 'li').addClass('search-keep');

                // show this node
                $li.show();

                // ensure this node's immediate container is visible
                $li.parent('ul.sortable-siblings').show();

                // show all ancestor <li> and their <ul> to expose path
                $li.parentsUntil('#tree', 'li').each(function () {
                    const $pli = $(this);
                    $pli.show();
                    $pli.children('ul.sortable-siblings').show();
                    // expand twisty visuals
                    $pli.children('.wi').find('> .twisty').removeClass('collapsed').text('▾');
                });
            }
            // Ensure the root list is visible so matches can appear
            $('#tree > ul.sortable-siblings').show();
        });
    }

    const debounce = (fn, ms = 150) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn.apply(null, a), ms); }; };

    // Run search on input
    $(document).on('input', '#treeSearch', debounce(applySearch, 150));

    // Re-run search after the tree re-renders
    if (typeof window.loadTree === 'function') {
        const _orig = window.loadTree;

        // const ret = _orig.apply(this, arguments);
        // setTimeout(() => $(document).trigger('applyTreeMode'), 60); // expand/collapse via event
        // setTimeout(applySearch, 120);                                // then re-filter matches            return ret;

        if (typeof window.loadTree === 'function') {
            const _orig = window.loadTree;
            window.loadTree = function () {
                const ret = _orig.apply(this, arguments);
                setTimeout(() => $(document).trigger('applyTreeMode'), 60);
                setTimeout(applySearch, 120);
                return ret;
            };
        };
    }
})();

// Helper: fetch projects into a <select>
function fillProjectsInto($sel) {
    return apiGet('projects:list').then(r => {
        $sel.empty();
        r.data.forEach(p => $sel.append(`<option value="${p.id}">${escapeHtml(p.name)}</option>`));
    });
}

/* ------------ Projects CRUD ------------- */
function loadSettingsProjects() {
    apiGet('projects:list').then(r => {
        const ul = $('#projList').empty();
        r.data.forEach(p => {
            const li = $(`
        <li class="list-group-item d-flex align-items-center gap-2">
          <input class="form-control form-control-sm proj-name" data-id="${p.id}" value="${escapeHtml(p.name)}" style="max-width:300px">
          <div class="ms-auto btn-group btn-group-sm">
            <button class="btn btn-outline-primary" data-proj-save="${p.id}">Save</button>
            <button class="btn btn-outline-danger" data-proj-del="${p.id}">Delete</button>
          </div>
        </li>`);
            ul.append(li);
        });
    });
}
$(document).on('submit', '#projAddForm', function (e) {
    e.preventDefault();
    const name = $(this).find('[name=name]').val().trim();
    if (!name) return;
    api('projects:create', { name }).then(() => { $(this).get(0).reset(); loadSettingsProjects(); fillProjectsInto($('#areasProjectSel')); fillProjectsInto($('#itersProjectSel')); });
});
$(document).on('click', '[data-proj-save]', function () {
    const id = $(this).data('proj-save');
    const name = $(this).closest('li').find('.proj-name').val().trim();
    if (!name) return alert('Name required');
    api('projects:update', { id, name }).then(() => { loadSettingsProjects(); fillProjectsInto($('#areasProjectSel')); fillProjectsInto($('#itersProjectSel')); });
});
$(document).on('click', '[data-proj-del]', function () {
    const id = $(this).data('proj-del');
    if (!confirm('Delete project and all its data?')) return;
    api('projects:delete', { id }).then(() => { loadSettingsProjects(); fillProjectsInto($('#areasProjectSel')); fillProjectsInto($('#itersProjectSel')); });
});

/* ------------ Areas CRUD (by project) ------------- */
function loadSettingsAreas() {
    const pid = $('#areasProjectSel').val(); if (!pid) return $('#areaList').empty();
    apiGet('areas:list', { project_id: pid }).then(r => {
        const ul = $('#areaList').empty();
        r.data.forEach(a => {
            const li = $(`
        <li class="list-group-item d-flex align-items-center gap-2">
          <input class="form-control form-control-sm area-name" data-id="${a.id}" value="${escapeHtml(a.name)}" style="max-width:300px">
          <div class="ms-auto btn-group btn-group-sm">
            <button class="btn btn-outline-primary" data-area-save="${a.id}">Save</button>
            <button class="btn btn-outline-danger" data-area-del="${a.id}">Delete</button>
          </div>
        </li>`);
            ul.append(li);
        });
    });
}
$(document).on('change', '#areasProjectSel', loadSettingsAreas);
$(document).on('submit', '#areaAddForm', function (e) {
    e.preventDefault();
    const pid = $('#areasProjectSel').val(); if (!pid) return alert('Pick a project first');
    const name = $(this).find('[name=name]').val().trim();
    if (!name) return;
    api('areas:create', { project_id: pid, name }).then(() => { $(this).get(0).reset(); loadSettingsAreas(); });
});
$(document).on('click', '[data-area-save]', function () {
    const id = $(this).data('area-save');
    const name = $(this).closest('li').find('.area-name').val().trim();
    if (!name) return alert('Name required');
    api('areas:update', { id, name }).then(() => loadSettingsAreas());
});
$(document).on('click', '[data-area-del]', function () {
    const id = $(this).data('area-del');
    if (!confirm('Delete area?')) return;
    api('areas:delete', { id }).then(() => loadSettingsAreas());
});

/* ------------ Iterations CRUD (by project) ------------- */
function loadSettingsIterations() {
    const pid = $('#itersProjectSel').val(); if (!pid) return $('#iterList').empty();
    apiGet('iterations:list', { project_id: pid }).then(r => {
        const ul = $('#iterList').empty();
        r.data.forEach(it => {
            const li = $(`
        <li class="list-group-item d-flex align-items-center gap-2 flex-wrap">
          <input class="form-control form-control-sm iter-path"  data-id="${it.id}" value="${escapeHtml(it.path)}" style="min-width:240px;max-width:320px">
          <input class="form-control form-control-sm iter-sd"    type="date" data-id="${it.id}" value="${it.start_date || ''}" title="Start">
          <input class="form-control form-control-sm iter-ed"    type="date" data-id="${it.id}" value="${it.end_date || ''}" title="End">
          <div class="ms-auto btn-group btn-group-sm">
            <button class="btn btn-outline-primary" data-iter-save="${it.id}">Save</button>
            <button class="btn btn-outline-danger" data-iter-del="${it.id}">Delete</button>
          </div>
        </li>`);
            ul.append(li);
        });
    });
}
$(document).on('change', '#itersProjectSel', loadSettingsIterations);
$(document).on('submit', '#iterAddForm', function (e) {
    e.preventDefault();
    const pid = $('#itersProjectSel').val(); if (!pid) return alert('Pick a project first');
    const path = $(this).find('[name=path]').val().trim();
    const sd = $(this).find('[name=start_date]').val() || '';
    const ed = $(this).find('[name=end_date]').val() || '';
    if (!path) return;
    api('iterations:create', { project_id: pid, path, start_date: sd, end_date: ed }).then(() => { $(this).get(0).reset(); loadSettingsIterations(); });
});
$(document).on('click', '[data-iter-save]', function () {
    const id = $(this).data('iter-save');
    const row = $(this).closest('li');
    const path = row.find('.iter-path').val().trim();
    const sd = row.find('.iter-sd').val() || '';
    const ed = row.find('.iter-ed').val() || '';
    if (!path) return alert('Path required');
    api('iterations:update', { id, path, start_date: sd, end_date: ed }).then(() => loadSettingsIterations());
});
$(document).on('click', '[data-iter-del]', function () {
    const id = $(this).data('iter-del');
    if (!confirm('Delete iteration?')) return;
    api('iterations:delete', { id }).then(() => loadSettingsIterations());
});

/* ------------ Initialize Settings lists ------------- */
function initSettingsCRUD() {
    // fill project selectors and initial lists
    fillProjectsInto($('#areasProjectSel')).then(() => loadSettingsAreas());
    fillProjectsInto($('#itersProjectSel')).then(() => loadSettingsIterations());
    loadSettingsProjects();
}

// If you have a tab change event, hook it; otherwise call once on load
$(function () { initSettingsCRUD(); });


document.addEventListener('shown.bs.tab', function (e) {
    const target = e.target.getAttribute('data-bs-target');
    if (target === '#set-columns') {
        if (typeof loadColumns === 'function') loadColumns();
    } else if (target === '#set-projects') {
        if (typeof loadSettingsProjects === 'function') loadSettingsProjects();
    } else if (target === '#set-areas') {
        if (typeof fillProjectsInto === 'function') {
            fillProjectsInto($('#areasProjectSel')).then(() => {
                if (typeof loadSettingsAreas === 'function') loadSettingsAreas();
            });
        }
    } else if (target === '#set-iterations') {
        if (typeof fillProjectsInto === 'function') {
            fillProjectsInto($('#itersProjectSel')).then(() => {
                if (typeof loadSettingsIterations === 'function') loadSettingsIterations();
            });
        }
    }
});

// Optional: preload the first non-DB tab once when Settings is opened
document.querySelectorAll('[data-bs-target="#tab-settings"]').forEach(btn => {
    btn.addEventListener('shown.bs.tab', () => {
        setTimeout(() => {
            const first = document.querySelector('[data-bs-target="#set-columns"]');
            if (first) new bootstrap.Tab(first).show();
        }, 0);
    });
});

// Keyboard shortcuts for Backlog search
$(document).on('keydown', function (e) {
    const $search = $('#treeSearch');
    if (!$search.length) return;

    const $t = $(e.target);
    const inEditable = $t.is('input, textarea, select, [contenteditable], [contenteditable="true"]');

    // Press "/" anywhere (except in inputs) -> focus search
    if (!inEditable && e.key === '/') {
        e.preventDefault();                 // stop browser's quick find / typing "/"
        $search.focus().select();           // focus & select existing text for quick overwrite
        return;
    }

    // Press "Esc" -> clear the search field and re-apply filter
    if (e.key === 'Escape') {
        if ($search.val() !== '') {
            $search.val('').trigger('input'); // triggers your debounced applySearch
        }
    }
});


$(function () {
    if ($('#newDesc').length && typeof $('#newDesc').summernote === 'function') {
        $('#newDesc').summernote({
            placeholder: 'Description',
            height: 180,
            toolbar: [
                ['style', ['bold', 'italic', 'underline', 'clear']],
                ['para', ['ul', 'ol', 'paragraph']],
                ['insert', ['link']],
                ['view', ['codeview', 'help']]
            ]
        });
    }
});
// Show current project + Switch button in the navbar
function renderCurrentProjectBar() {
    const $nav = $('.navbar');
    if (!$nav.length) return;

    const name = ($('#project option:selected').text() || '').trim() || '(no project)';

    let $bar = $('#currentProjectBar');
    if (!$bar.length) {
        const $container = $nav.find('.container-fluid').first();
        $bar = $(`
          <div id="currentProjectBar" class="d-flex align-items-center gap-2 ms-auto">
            <span class="badge bg-info text-dark" id="currentProjectName"></span>
            <button class="btn btn-sm btn-outline-light" id="switchProjectBtn">Switch Project</button>
          </div>
        `);
        if ($container.length) $container.append($bar); else $nav.append($bar);
    }
    $('#currentProjectName').text(name);
}