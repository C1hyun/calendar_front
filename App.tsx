import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

const API_BASE_URL = 'http://localhost:3000';
const DEFAULT_USER_ID = 1;

interface Task {
  id: string;
  title: string;
  period: string;
  content: string;
  dDay: string;
}

interface Todo {
  todoId: number;
  userId?: number;
  title: string;
  content: string | null;
  startDate: string;
  endDate: string;
  completed: boolean;
  createdAt?: string;
  completedAt?: string | null;
}

type TabType = '과제' | '할 일' | '달력' | '시간표';

const formatPeriod = (start: string, end: string) => `${start} ~ ${end}`;

const formatDDay = (end: string) => {
  const today = new Date();
  const target = new Date(end);
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diff =
    Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diff > 0) {
    return `D-${diff}`;
  }
  if (diff === 0) {
    return 'D-Day';
  }
  return `D+${Math.abs(diff)}`;
};

const padNumber = (value: number) => String(value).padStart(2, '0');
const dateKeyFromParts = (year: number, monthIndex: number, day: number) =>
  `${year}-${padNumber(monthIndex + 1)}-${padNumber(day)}`;

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('과제');
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isAddingTodo, setIsAddingTodo] = useState(false);
  const [newTodo, setNewTodo] = useState({
    title: '',
    content: '',
    startDate: '',
    endDate: '',
  });
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loadingTodos, setLoadingTodos] = useState(false);
  const [isSubmittingTodo, setIsSubmittingTodo] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getMonthName = (date: Date) => {
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
  };

  const isToday = (day: number, date: Date) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const changeMonth = (direction: 'prev' | 'next') => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const todosByDate = useMemo(() => {
    const map: Record<
      string,
      {
        count: number;
        titles: string[];
      }
    > = {};

    todos.forEach((todo) => {
      const start = new Date(todo.startDate);
      const end = new Date(todo.endDate);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return;
      }

      const cursor = new Date(start);
      while (cursor <= end) {
        const key = dateKeyFromParts(
          cursor.getFullYear(),
          cursor.getMonth(),
          cursor.getDate(),
        );
        if (!map[key]) {
          map[key] = { count: 0, titles: [] };
        }
        map[key].count += 1;
        map[key].titles.push(todo.title);
        cursor.setDate(cursor.getDate() + 1);
      }
    });

    return map;
  }, [todos]);

  const tasks = useMemo<Task[]>(() => {
    return todos.map((todo) => ({
      id: todo.todoId.toString(),
      title: todo.title,
      period: formatPeriod(todo.startDate, todo.endDate),
      content: todo.content ?? '내용이 없습니다.',
      dDay: formatDDay(todo.endDate),
    }));
  }, [todos]);

  const isTodoValid = useMemo(() => {
    return (
      newTodo.title.trim() !== '' &&
      newTodo.content.trim() !== '' &&
      newTodo.startDate.trim() !== '' &&
      newTodo.endDate.trim() !== ''
    );
  }, [newTodo]);

  const fetchTodos = useCallback(async () => {
    if (!isLoggedIn || !userId) return;
    try {
      setLoadingTodos(true);
      const response = await fetch(`${API_BASE_URL}/todos`);
      if (!response.ok) {
        throw new Error('할 일 목록을 불러오지 못했습니다.');
      }
      const data = await response.json();
      setTodos(data);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage('할 일을 불러오지 못했습니다. 다시 시도해주세요.');
    } finally {
      setLoadingTodos(false);
    }
  }, [isLoggedIn, userId]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchTodos();
    }
  }, [isLoggedIn, fetchTodos]);

  const handleLogin = async () => {
    if (!loginEmail.trim() || !loginPassword.trim()) {
      Alert.alert('입력 오류', '이메일과 비밀번호를 모두 입력해주세요.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(loginEmail.trim())) {
      Alert.alert('입력 오류', '올바른 이메일 형식을 입력해주세요.');
      return;
    }

    try {
      setIsLoggingIn(true);
      // TODO: 실제 로그인 API 엔드포인트로 변경 필요
      // 임시로 기본 userId를 사용 (백엔드 API가 준비되면 수정)
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: loginEmail.trim(),
          password: loginPassword,
        }),
      });

      if (!response.ok) {
        // API가 없을 경우 임시로 기본 사용자로 로그인 처리
        if (response.status === 404) {
          console.log('로그인 API가 아직 준비되지 않았습니다. 기본 사용자로 로그인합니다.');
          setUserId(DEFAULT_USER_ID);
          setIsLoggedIn(true);
          setActiveTab('과제');
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || '로그인에 실패했습니다.');
      }

      const data = await response.json();
      const loggedInUserId = data.userId || data.user?.userId || DEFAULT_USER_ID;
      
      setUserId(loggedInUserId);
      setIsLoggedIn(true);
      setActiveTab('과제');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : '로그인 중 오류가 발생했습니다.';
      Alert.alert('로그인 실패', errorMessage);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleToggleTodo = async (todo: Todo) => {
    try {
      const response = await fetch(`${API_BASE_URL}/todos/${todo.todoId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ completed: !todo.completed }),
      });

      if (!response.ok) {
        throw new Error('상태를 업데이트하지 못했습니다.');
      }

      const updated = await response.json();
      setTodos((prev) =>
        prev.map((item) => (item.todoId === updated.todoId ? updated : item)),
      );
    } catch (error) {
      Alert.alert('오류', '할 일 상태를 변경하지 못했습니다.');
    }
  };

  const handleDeleteTodo = async (todoId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/todos/${todoId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('삭제하지 못했습니다.');
      }

      setTodos((prev) => prev.filter((todo) => todo.todoId !== todoId));
    } catch (error) {
      Alert.alert('오류', '할 일을 삭제하지 못했습니다.');
    }
  };

  const handleChangeNewTodo = (field: keyof typeof newTodo, value: string) => {
    setNewTodo((prev) => ({ ...prev, [field]: value }));
  };

  const resetNewTodo = () => {
    setNewTodo({
      title: '',
      content: '',
      startDate: '',
      endDate: '',
    });
  };

  const handleSaveTodo = async () => {
    if (!isTodoValid || isSubmittingTodo || !userId) {
      return;
    }

    try {
      setIsSubmittingTodo(true);
      const response = await fetch(`${API_BASE_URL}/todos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          title: newTodo.title.trim(),
          content: newTodo.content.trim(),
          startDate: newTodo.startDate.trim(),
          endDate: newTodo.endDate.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('등록에 실패했습니다.');
      }

      const created = await response.json();
      setTodos((prev) => [...prev, created]);
      resetNewTodo();
      setIsAddingTodo(false);
    } catch (error) {
      Alert.alert('오류', '할 일을 저장하지 못했습니다.');
    } finally {
      setIsSubmittingTodo(false);
    }
  };

  const handleCancelTodo = () => {
    resetNewTodo();
    setIsAddingTodo(false);
  };

  const renderTaskList = () => (
    <ScrollView style={styles.contentContainer}>
      <Text style={styles.sectionTitle}>진행 중인 과제</Text>
      {tasks.length === 0 && (
        <Text style={styles.emptyStateText}>
          아직 등록된 과제가 없습니다. 할 일 탭에서 새로 추가해보세요.
        </Text>
      )}
      {tasks.map((task) => (
        <View key={task.id} style={styles.taskCard}>
          <View style={styles.taskHeader}>
            <Text style={styles.taskTitle}>{task.title}</Text>
            <View style={styles.dDayBadge}>
              <Text style={styles.dDayText}>{task.dDay}</Text>
            </View>
          </View>
          <Text style={styles.taskPeriod}>{task.period}</Text>
          <Text style={styles.taskContent}>{task.content}</Text>
        </View>
      ))}
    </ScrollView>
  );

  const renderTodoList = () => (
    <ScrollView style={styles.contentContainer}>
      <Text style={styles.sectionTitle}>오늘의 할 일</Text>

      {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
      {loadingTodos && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color="#333" />
          <Text style={styles.loadingText}>불러오는 중...</Text>
        </View>
      )}

      {!loadingTodos && (
        <>
          {!isAddingTodo ? (
            <TouchableOpacity
              style={styles.addTodoTrigger}
              onPress={() => setIsAddingTodo(true)}
            >
              <Text style={styles.addTodoTriggerText}>추가</Text>
              <Text style={styles.addTodoTriggerSub}>
                제목 · 내용 · 시작/종료 날짜를 입력하세요
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.todoForm}>
              <Text style={styles.todoFormTitle}>새 할 일 등록</Text>
              <TextInput
                style={styles.todoFormInput}
                placeholder="제목"
                value={newTodo.title}
                onChangeText={(text) => handleChangeNewTodo('title', text)}
              />
              <TextInput
                style={[styles.todoFormInput, styles.todoFormTextarea]}
                placeholder="내용"
                value={newTodo.content}
                multiline
                onChangeText={(text) => handleChangeNewTodo('content', text)}
              />
              <View style={styles.todoFormDateRow}>
                <TextInput
                  style={[styles.todoFormInput, styles.todoFormDateInput]}
                  placeholder="시작 날짜 (YYYY-MM-DD)"
                  value={newTodo.startDate}
                  onChangeText={(text) => handleChangeNewTodo('startDate', text)}
                />
                <TextInput
                  style={[styles.todoFormInput, styles.todoFormDateInput]}
                  placeholder="종료 날짜 (YYYY-MM-DD)"
                  value={newTodo.endDate}
                  onChangeText={(text) => handleChangeNewTodo('endDate', text)}
                />
              </View>
              <View style={styles.todoFormActions}>
                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    (!isTodoValid || isSubmittingTodo) && styles.disabledButton,
                  ]}
                  onPress={handleSaveTodo}
                  disabled={!isTodoValid || isSubmittingTodo}
                >
                  <Text style={styles.saveButtonText}>
                    {isSubmittingTodo ? '저장 중...' : '저장'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancelTodo}
                >
                  <Text style={styles.cancelButtonText}>취소</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.todoList}>
            {todos.length === 0 && (
              <Text style={styles.emptyStateText}>
                등록된 할 일이 없습니다. 위 버튼으로 추가해보세요.
              </Text>
            )}
            {todos.map((todo) => (
              <View key={todo.todoId} style={styles.todoItem}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => handleToggleTodo(todo)}
                >
                  {todo.completed && <View style={styles.checkboxChecked} />}
                </TouchableOpacity>
                <View style={styles.todoContent}>
                  <Text style={styles.todoTitle}>{todo.title}</Text>
                  <Text style={styles.todoDescription}>
                    {todo.content || '내용이 없습니다.'}
                  </Text>
                  <Text style={styles.todoDate}>
                    {formatPeriod(todo.startDate, todo.endDate)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteTodo(todo.todoId)}
                >
                  <Text style={styles.deleteButtonText}>삭제</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    const remainingDays = days.length % 7;
    if (remainingDays !== 0) {
      for (let i = 0; i < 7 - remainingDays; i++) {
        days.push(null);
      }
    }

    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    return (
      <ScrollView style={styles.contentContainer}>
        <View style={styles.calendarContainer}>
          <View style={styles.calendarMonthHeader}>
            <TouchableOpacity
              style={styles.monthButton}
              onPress={() => changeMonth('prev')}
            >
              <Text style={styles.monthButtonText}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.monthTitle}>{getMonthName(currentDate)}</Text>
            <TouchableOpacity
              style={styles.monthButton}
              onPress={() => changeMonth('next')}
            >
              <Text style={styles.monthButtonText}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.calendarHeader}>
            {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
              <Text
                key={index}
                style={[
                  styles.calendarDay,
                  index === 0 && styles.sundayText,
                  index === 6 && styles.saturdayText,
                ]}
              >
                {day}
              </Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {weeks.map((week, weekIndex) => (
              <View key={weekIndex} style={styles.calendarRow}>
                {week.map((day, dayIndex) => {
                  if (day === null) {
                    return (
                      <View
                        key={`${weekIndex}-${dayIndex}`}
                        style={styles.calendarCell}
                      />
                    );
                  }

                  const dateKey = dateKeyFromParts(
                    currentDate.getFullYear(),
                    currentDate.getMonth(),
                    day,
                  );
                  const todoInfo = todosByDate[dateKey];

                  return (
                    <View
                      key={`${weekIndex}-${dayIndex}`}
                      style={[
                        styles.calendarCell,
                        isToday(day, currentDate) && styles.todayCell,
                        todoInfo && styles.calendarCellHighlight,
                      ]}
                    >
                      <Text
                        style={[
                          styles.calendarDateText,
                          isToday(day, currentDate) && styles.todayText,
                          dayIndex === 0 && styles.sundayText,
                          dayIndex === 6 && styles.saturdayText,
                        ]}
                      >
                        {day}
                      </Text>
                      {todoInfo && (
                        <View style={styles.calendarTodoIndicator}>
                          <View style={styles.calendarTodoDot} />
                          <Text style={styles.calendarTodoCount}>
                            {todoInfo.count}건
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderTimeTable = () => (
    <ScrollView style={styles.contentContainer}>
      <View style={styles.calendarContainer}>
        <View style={styles.calendarHeader}>
          {['월', '화', '수', '목', '금', '토', '일'].map((day, index) => (
            <Text key={index} style={styles.calendarDay}>
              {day}
            </Text>
          ))}
        </View>
        <View style={styles.calendarGrid}>
          {Array.from({ length: 12 }, (_, i) => i + 9).map((num) => (
            <View key={num} style={styles.calendarRow}>
              <Text style={styles.calendarDate}>{num}</Text>
              {Array.from({ length: 7 }).map((_, i) => (
                <View key={i} style={styles.calendarCell} />
              ))}
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );

  const renderContent = () => {
    switch (activeTab) {
      case '과제':
        return renderTaskList();
      case '할 일':
        return renderTodoList();
      case '달력':
        return renderCalendar();
      case '시간표':
        return renderTimeTable();
      default:
        return renderTaskList();
    }
  };

  const renderLoginPage = () => (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.loginContent}>
          <View style={styles.loginHeader}>
            <Text style={styles.loginTitle}>일정 관리 앱</Text>
            <Text style={styles.loginSubtitle}>로그인하여 시작하세요</Text>
          </View>

          <View style={styles.loginForm}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>이메일</Text>
              <TextInput
                style={styles.input}
                placeholder="이메일을 입력하세요"
                placeholderTextColor="#999"
                value={loginEmail}
                onChangeText={setLoginEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoggingIn}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>비밀번호</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="비밀번호를 입력하세요"
                  placeholderTextColor="#999"
                  value={loginPassword}
                  onChangeText={setLoginPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoggingIn}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={isLoggingIn}
                >
                  <Text style={styles.eyeButtonText}>
                    {showPassword ? '숨기기' : '보기'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.loginButton, isLoggingIn && styles.disabledButton]}
              onPress={handleLogin}
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>로그인</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  if (!isLoggedIn) {
    return renderLoginPage();
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>일정 관리 앱</Text>
      </View>

      {renderContent()}

      <View style={styles.tabBar}>
        {(['과제', '할 일', '달력', '시간표'] as TabType[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[styles.tabText, activeTab === tab && styles.activeTabText]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  loginContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loginHeader: {
    alignItems: 'center',
    marginBottom: 48,
  },
  loginTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  loginSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  loginForm: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    color: '#333',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  eyeButton: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  eyeButtonText: {
    fontSize: 14,
    color: '#666',
  },
  loginButton: {
    backgroundColor: '#4caf50',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  header: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  taskCard: {
    backgroundColor: '#e8e8e8',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  dDayBadge: {
    backgroundColor: '#999',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  dDayText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  taskPeriod: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  taskContent: {
    fontSize: 14,
    color: '#666',
  },
  todoList: {
    gap: 12,
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#999',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    width: 14,
    height: 14,
    backgroundColor: '#333',
    borderRadius: 2,
  },
  deleteButton: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  addTodoTrigger: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 16,
    backgroundColor: '#fafafa',
    marginBottom: 16,
  },
  addTodoTriggerText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  addTodoTriggerSub: {
    fontSize: 13,
    color: '#777',
  },
  todoForm: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 20,
    gap: 12,
  },
  todoFormTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  todoFormInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9f9f9',
  },
  todoFormTextarea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  todoFormDateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  todoFormDateInput: {
    flex: 1,
  },
  todoFormActions: {
    flexDirection: 'row',
    gap: 12,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#4caf50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  disabledButton: {
    backgroundColor: '#a5d6a7',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#eee',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#555',
    fontWeight: '600',
  },
  todoContent: {
    flex: 1,
  },
  todoTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  todoDescription: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  todoDate: {
    fontSize: 13,
    color: '#777',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#888',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorText: {
    color: '#d32f2f',
    marginBottom: 12,
    textAlign: 'center',
  },
  loadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  loadingText: {
    color: '#555',
  },
  calendarContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 8,
  },
  calendarMonthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  monthButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
  },
  monthButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  calendarHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingBottom: 8,
    marginBottom: 8,
  },
  calendarDay: {
    flex: 1,
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 14,
    color: '#333',
  },
  sundayText: {
    color: '#ff4444',
  },
  saturdayText: {
    color: '#4444ff',
  },
  calendarGrid: {
    gap: 1,
  },
  calendarRow: {
    flexDirection: 'row',
    height: 50,
    alignItems: 'center',
  },
  calendarDate: {
    width: 30,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  calendarDateText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  calendarCell: {
    flex: 1,
    height: '100%',
    backgroundColor: '#fff',
    borderWidth: 0.5,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarCellHighlight: {
    borderColor: '#2196f3',
    borderWidth: 2,
  },
  todayCell: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3',
    borderWidth: 2,
  },
  todayText: {
    color: '#2196f3',
    fontWeight: 'bold',
  },
  calendarTodoIndicator: {
    marginTop: 4,
    alignItems: 'center',
    gap: 2,
  },
  calendarTodoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2196f3',
  },
  calendarTodoCount: {
    fontSize: 10,
    color: '#2196f3',
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  activeTab: {
    backgroundColor: '#fff',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  activeTabText: {
    color: '#000',
    fontWeight: 'bold',
  },
});

