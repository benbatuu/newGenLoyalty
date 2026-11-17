class AuthUser {
  AuthUser({
    required this.id,
    required this.email,
    required this.name,
    required this.role,
    this.tenantId,
  });

  final String id;
  final String email;
  final String name;
  final String role;
  final String? tenantId;

  bool get isOwner => role == 'STORE_OWNER';
  bool get isCashier => role == 'CASHIER';

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    return AuthUser(
      id: json['id'] as String,
      email: json['email'] as String,
      name: json['name'] as String,
      role: json['role'] as String,
      tenantId: json['tenantId'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'email': email,
        'name': name,
        'role': role,
        'tenantId': tenantId,
      };
}
