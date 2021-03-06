/// <reference path="typings/angularjs/angular.d.ts"/>
/// <reference path="typings/jqueryui/jqueryui.d.ts"/>
/// <reference path="typings/bootstrap/bootstrap.d.ts"/>
/// <reference path="infra.ts"/>
/// <reference path="app.ts"/>
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var EVENT_LOGIN_REQUIRED = "event:loginRequired";
var EVENT_LOGIN_REQUEST = "event:loginRequest";
var EVENT_LOGIN_CONFIRMED = "event:loginConfirmed";
var EVENT_LOGOUT_REQUEST = "event:logoutRequest";
var BOARD_CHANGE = "TB_BOARD_CHANGE";
var BOARD_LOAD = "TB_BOARD_LOAD";
var BOARD_NEWCOLUMN = "TB_BOARD_NEWCOLUMN";
var BOARD_DELCOLUMN = "TB_BOARD_DELCOLUMN";
var PAGESIZE_SMALL = 5;
var PAGESIZE_MEDIUM = 10;
var PAGESIZE_BIG = 15;
;
angular.module('taskboard')
    .controller('AppCtrl', function ($rootScope, $scope, $location, $window, taskBoardService, $localStorage, $http, $interval) {
    $scope.hasRole = function (role) {
        if ($scope.identity && $scope.identity.roles) {
            var roles = $scope.identity.roles;
            for (var i = 0; i < roles.length; i++) {
                if (roles[i] == role) {
                    return true;
                }
            }
        }
        return false;
    };
    var refreshToken;
    // initialize form
    var showLogin = function (visible) {
        if (angular.isDefined(refreshToken)) {
            $interval.cancel(refreshToken);
            refreshToken = undefined;
        }
        if (!visible) {
            refreshToken = $interval(function () {
                $http.post("ping", "")
                    .success(function (data) {
                    if (data !== "") {
                        $localStorage.jwtToken = data;
                    }
                });
            }, 600000); // 10 minutos
            taskBoardService.whoAmI(function (identity) {
                $scope.identity = identity;
            });
        }
        $("#loginForm").modal(visible ? "show" : "hide");
    };
    // user starts logged out 
    $scope.loggedIn = false;
    $scope.logMeIn = function () {
        $scope.$emit(EVENT_LOGIN_REQUEST, $scope.login.username, $scope.login.password);
        $scope.login.password = "";
    };
    // clean password
    $scope.logout = function () {
        $scope.loggedIn = false;
        $window.location.href = '#/logout';
        $scope.identity = new taskboard.IdentityDTO();
        $scope.board = null;
        $scope.login = null;
        $scope.$emit(EVENT_LOGOUT_REQUEST);
    };
    $scope.$on(EVENT_LOGIN_REQUIRED, function () {
        showLogin(true);
        $scope.loggedIn = false;
    });
    $scope.$on(EVENT_LOGIN_CONFIRMED, function (event, newPrincipal) {
        showLogin(false);
        $scope.loggedIn = true;
    });
    /*
     * business logic
     */
    function showBoardPanel() {
        $("#boardPanel").modal("show").on('hidden.bs.modal', function (e) {
            $scope.eboard = null;
        });
    }
    ;
    // keeps a record of the change of the current board
    $scope.$on(BOARD_LOAD, function (event, b) {
        $scope.board = b;
    });
    $scope.newBoard = function () {
        $scope.eboard = new taskboard.Board();
        showBoardPanel();
    };
    $scope.editBoard = function () {
        if ($scope.board != null) {
            $scope.eboard = new taskboard.Board().copy($scope.board);
            showBoardPanel();
        }
    };
    $scope.saveBoard = function () {
        var bid = $scope.eboard.id; // eboard is erased in the modal hidden event callback, so save it
        taskBoardService.saveBoard($scope.eboard, function (result) {
            if (bid == null) {
                $location.path("/board/" + result.id);
            }
            else {
                $scope.$emit(BOARD_CHANGE, result);
            }
        });
    };
    $scope.deleteBoard = function (board) {
        taskBoardService.deleteBoard(board.id, function () {
            $scope.gridProvider.refresh();
            // if the current board is the same as the one being deleted
            if ($scope.board.id === board.id) {
                $location.path("/welcome");
            }
        });
    };
    // === list boards ===
    var criteria = new taskboard.BoardSearchDTO();
    criteria.pageSize = PAGESIZE_MEDIUM;
    // initiate sorting
    criteria.ascending = true;
    criteria.orderBy = "name";
    $scope.boardCriteria = criteria;
    var ds = {
        fetch: function (c, successCallback) {
            taskBoardService.fetchBoards(c, successCallback);
        }
    };
    $scope.gridProvider = new toolkit.Provider(ds, $scope.boardCriteria);
    function showListBoardPanel(show) {
        var e = $("#listBoardPanel");
        if (show) {
            e.modal("show").on('hidden.bs.modal', function (e) {
                $scope.gridProvider.reset();
                $scope.boardCriteria.name = '';
            });
        }
        else {
            e.modal("hide");
        }
    }
    ;
    $scope.listBoard = function () {
        showListBoardPanel(true);
        $scope.searchBoards();
    };
    $scope.searchBoards = function () {
        $scope.gridProvider.reset();
        $scope.gridProvider.refresh();
    };
    $scope.closeList = function () {
        showListBoardPanel(false);
    };
    // === list board users ===
    var criteriaUsers = new taskboard.BoardUserSearchDTO();
    criteriaUsers.pageSize = PAGESIZE_MEDIUM;
    // initiate sorting
    criteriaUsers.ascending = true;
    criteriaUsers.orderBy = "name";
    $scope.boardUsersCriteria = criteriaUsers;
    var dsUsers = {
        fetch: function (c, successCallback) {
            c.boardId = $scope.board.id;
            taskBoardService.fetchBoardAllUsers(c, successCallback);
        }
    };
    $scope.gridUsersProvider = new toolkit.Provider(dsUsers, $scope.boardUsersCriteria);
    function showListBoardUsersPanel(show) {
        var e = $("#listBoardUsersPanel");
        if (show) {
            e.modal("show").on('hidden.bs.modal', function (e) {
                $scope.gridUsersProvider.reset();
                $scope.boardUsersCriteria.name = '';
            });
        }
        else {
            e.modal("hide");
        }
    }
    ;
    $scope.openBoardUsers = function () {
        if ($scope.board != null) {
            showListBoardUsersPanel(true);
            $scope.searchBoardUsers();
        }
    };
    $scope.searchBoardUsers = function () {
        $scope.gridUsersProvider.reset();
        $scope.gridUsersProvider.refresh();
    };
    $scope.closeUsersList = function () {
        showListBoardUsersPanel(false);
    };
    $scope.updateBoardUser = function (user) {
        if (user.belongs) {
            var bu = new taskboard.AddUserToBoardIn();
            bu.boardId = $scope.board.id;
            bu.userId = user.id;
            taskBoardService.addUserToBoard(bu);
        }
        else {
            var bu = new taskboard.RemoveUserFromBoardIn();
            bu.boardId = $scope.board.id;
            bu.userId = user.id;
            taskBoardService.removeUserFromBoard(bu);
        }
    };
    // =========
    $scope.newColumn = function () {
        if ($scope.board != null) {
            $scope.$broadcast(BOARD_NEWCOLUMN);
        }
    };
    $scope.deleteColumn = function () {
        if ($scope.board != null) {
            $scope.$broadcast(BOARD_DELCOLUMN);
        }
    };
});
function BoardCtrl($scope, $routeParams, taskBoardService) {
    $scope.colorOptions = [
        '#FFFFFF',
        '#DBDBDB',
        '#FFB5B5',
        '#FF9E9E',
        '#FCC7FC',
        '#FC9AFB',
        '#CCD0FC',
        '#989FFA',
        '#CFFAFC',
        '#9EFAFF',
        '#94D6FF',
        '#C1F7C2',
        '#A2FCA3',
        '#FAFCD2',
        '#FAFFA1',
        '#FCE4D4',
        '#FCC19D'
    ];
    $scope.lastColor = $scope.colorOptions[14];
    $scope.editingColumn = false;
    var expandedTasks = new Array();
    if ($routeParams.boardId != null) {
        var ignoreEvents = false;
        var cacheBoard;
        var bId = $routeParams.boardId;
        var reloadCallback = function (result) {
            $scope.board = result;
            // launches a event to inform the app controller of the current board instance
            $scope.$emit(BOARD_LOAD, result);
            // rebuild expanded tasks
            var expanded = new Array();
            if (result.lanes != null) {
                for (var l = 0; l < result.lanes.length; l++) {
                    var lane = result.lanes[l];
                    if (lane.tasks != null) {
                        for (var t = 0; t < lane.tasks.length; t++) {
                            var task = lane.tasks[t];
                            // only tasks still present in the board will be collected
                            for (var x = 0; x < expandedTasks.length; x++) {
                                if (expandedTasks[x] === task.id) {
                                    expanded.push(expandedTasks[x]);
                                }
                            }
                        }
                    }
                }
            }
            expandedTasks = expanded;
        };
        taskBoardService.fullyLoadBoardById(bId, reloadCallback);
        var listener = function (board) {
            //toolkit.notice("DEBUG", "board " + bId + " changed");
            if (ignoreEvents) {
                cacheBoard = board;
            }
            else {
                cacheBoard = null;
                $scope.$apply(function () {
                    reloadCallback(board);
                });
            }
        };
        var p = new Poller("/feed");
        p.onMessage("board:" + bId, listener).connect();
        $scope.$on("$destroy", function (event) {
            //p.removeListener("board_" + bId, listener);
            p.disconnect();
        });
        $scope.$on(TASK_MOVE_BEGIN, function (event) {
            ignoreEvents = true;
        });
        $scope.$on(TASK_MOVE_END, function (event, data) {
            ignoreEvents = false;
            if (data.startLane !== data.endLane || data.startPosition !== data.endPosition) {
                //toolkit.stickyError("DEBUG", data.startLane + "." + (data.startPosition+1) + " -> " + data.endLane + "." + (data.endPosition+1));
                var taskId = $scope.board.lanes[data.startLane].tasks[data.startPosition].id;
                var laneId = $scope.board.lanes[data.endLane].id;
                taskBoardService.moveTask({
                    taskId: taskId,
                    laneId: laneId,
                    position: data.endPosition + 1
                });
            }
            else if (cacheBoard != null) {
                $scope.$apply(function () {
                    reloadCallback(cacheBoard);
                });
                cacheBoard = null;
            }
        });
    }
    $scope.toogle = function (taskId) {
        var i = expandedTasks.indexOf(taskId);
        if (i != -1) {
            expandedTasks.splice(i, 1);
        }
        else {
            expandedTasks.push(taskId);
        }
    };
    // method to avoid colapsing an expanded task when the board refreshs
    $scope.isExpanded = function (taskId) {
        return expandedTasks.indexOf(taskId) != -1;
    };
    $scope.$on(BOARD_CHANGE, function (event, b) {
        $scope.board.name = b.name;
        $scope.board.description = b.description;
    });
    $scope.$on(BOARD_NEWCOLUMN, function (event) {
        taskBoardService.addLane($scope.board.id);
    });
    $scope.$on(BOARD_DELCOLUMN, function (event) {
        taskBoardService.deleteLastLane($scope.board.id);
    });
    $scope.saveLane = function (cname, lane) {
        if (cname != lane.name) {
            lane.name = cname;
            taskBoardService.saveLane(lane, function (result) {
                lane.version = result.version;
            });
        }
    };
    // initialize form
    function showTaskPanel() {
        $("#taskPanel").modal("show").on('hidden.bs.modal', function (e) {
            $scope.etask = null;
        });
    }
    ;
    $scope.selectTaskColor = function (color) {
        $scope.etask.headColor = color;
        $scope.etask.bodyColor = toolkit.LightenDarkenColor(color, 25);
        $scope.lastColor = color;
    };
    $scope.newTask = function (lane) {
        $scope.etask = new taskboard.Task();
        $scope.etask.laneId = lane.id;
        $scope.etask.lane = lane;
        $scope.etask.headColor = $scope.lastColor;
        $scope.etask.bodyColor = toolkit.LightenDarkenColor($scope.lastColor, 25);
        taskBoardService.fetchBoardUsers($routeParams.boardId, function (result) {
            $scope.boardUsers = result;
            showTaskPanel();
        });
    };
    $scope.saveTask = function () {
        if ($scope.taskUser) {
            $scope.etask.userId = $scope.taskUser.id;
        }
        else {
            $scope.etask.userId = null;
        }
        taskBoardService.saveTask($scope.etask, null, function (cause) {
            toolkit.stickyError("BAD", cause.message);
        });
    };
    $scope.editTask = function (task) {
        $scope.taskUser = null;
        $scope.etask = new taskboard.Task().copy(task);
        taskBoardService.fetchBoardUsers($routeParams.boardId, function (result) {
            $scope.boardUsers = result;
            for (var i = 0; i < result.length; i++) {
                if (result[i].id == task.userId) {
                    $scope.taskUser = result[i];
                    break;
                }
            }
            showTaskPanel();
        });
    };
    $scope.removeTask = function (task) {
        toolkit.confirm({
            question: "This task will be remove.<br>Do you wish to continue?",
            callback: function () {
                taskBoardService.moveTask({
                    taskId: task.id,
                    laneId: task.laneId,
                    position: -1
                });
            }
        });
    };
    $scope.addNotification = function (lane, email) {
        var notif = new taskboard.Notification();
        notif.email = email;
        notif.laneId = lane.id;
        notif.taskId = $scope.etask.id;
        taskBoardService.saveNotification(notif, function (result) {
            $scope.notifProvider.refresh();
        });
    };
    $scope.saveNotification = function (notif) {
        taskBoardService.saveNotification(notif, function (result) {
            $scope.notifProvider.refresh();
        });
    };
    $scope.deleteNotification = function (notif) {
        taskBoardService.deleteNotification(notif.id, function () {
            $scope.notifProvider.refresh();
        });
    };
    var criteria = new taskboard.NotificationSearchDTO();
    criteria.pageSize = PAGESIZE_SMALL;
    // initiate sorting
    criteria.ascending = true;
    criteria.orderBy = "email";
    var ds = {
        fetch: function (criteria, successCallback) {
            taskBoardService.fetchNotifications(criteria, successCallback);
        }
    };
    $scope.notifProvider = new toolkit.Provider(ds, criteria);
    function showNotificationsPanel() {
        $("#notifPanel").modal("show").on('hidden.bs.modal', function (e) {
            $scope.notifProvider.reset();
        });
    }
    ;
    $scope.editNotifications = function (task) {
        $scope.etask = task;
        criteria.taskId = task.id;
        $scope.notifProvider.refresh();
        showNotificationsPanel();
    };
    $scope.getRealLane = function (lane) {
        var lanes = $scope.board.lanes;
        for (var i = 0; i < lanes.length; i++) {
            if (lanes[i].id === lane.id) {
                return lanes[i];
            }
        }
    };
}
var UserEdit = (function (_super) {
    __extends(UserEdit, _super);
    function UserEdit() {
        _super.apply(this, arguments);
    }
    return UserEdit;
}(taskboard.UserDTO));
function UsersCtrl($scope, taskBoardService) {
    $scope.criteria = new taskboard.UserSearchDTO();
    $scope.criteria.pageSize = PAGESIZE_MEDIUM;
    // initiate sorting
    $scope.criteria.ascending = true;
    $scope.criteria.orderBy = "name";
    var ds = {
        fetch: function (c, successCallback) {
            taskBoardService.fetchUsers(c, successCallback);
        }
    };
    $scope.gridProvider = new toolkit.Provider(ds, $scope.criteria);
    // initialize form
    function showUserPanel(show) {
        if (show) {
            toolkit.showModal("#userPanel", true, function (e) {
                $scope.euser = null;
            });
        }
        else {
            toolkit.showModal("#userPanel", false);
        }
    }
    ;
    $scope.newUser = function () {
        $scope.euser = new UserEdit();
        showUserPanel(true);
    };
    $scope.editUser = function (user) {
        $scope.euser = new UserEdit();
        $scope.euser.copy(user);
        showUserPanel(true);
    };
    $scope.saveUser = function () {
        // validate data        
        if ($scope.euser.id === undefined && toolkit.isEmpty($scope.euser.password)) {
            toolkit.notice("Password", "Password is mandatory when creating a user!");
        }
        else if (!toolkit.isEmpty($scope.euser.password) && $scope.euser.password !== $scope.euser.passwordCheck) {
            toolkit.notice("Password", "Password retype check failed!");
        }
        else {
            var user = new taskboard.UserDTO();
            user.copy($scope.euser);
            taskBoardService.saveUser(user, function (result) {
                $scope.gridProvider.refresh();
                showUserPanel(false);
            });
        }
    };
    $scope.deleteUser = function (user) {
        var iv = new taskboard.IdVersionDTO();
        iv.id = user.id,
            iv.version = user.version;
        taskBoardService.deleteUser(iv, function () {
            $scope.gridProvider.refresh();
        });
    };
    $scope.search = function () {
        $scope.gridProvider.reset();
        $scope.gridProvider.refresh();
    };
    $scope.search();
}
function UserCtrl($scope, $routeParams, taskBoardService) {
    if ($scope.identity) {
        $scope.name = $scope.identity.name;
    }
    $scope.changeName = function () {
        taskBoardService.saveUserName($scope.name, function () {
            toolkit.success("Name changed successfully.");
            $scope.identity.name = $scope.name;
        });
    };
    $scope.changePassword = function () {
        // check if password check is ok
        if ($scope.password != $scope.passwordCheck) {
            toolkit.stickyError("Password", "The new password does not match the retyped one.");
            return;
        }
        var input = new taskboard.ChangeUserPasswordIn();
        input.oldPwd = $scope.oldPassword;
        input.newPwd = $scope.password;
        taskBoardService.changeUserPassword(input, function () {
            toolkit.success("Password changed successfully.");
        });
        $scope.oldPassword = '';
        $scope.password = '';
    };
}
