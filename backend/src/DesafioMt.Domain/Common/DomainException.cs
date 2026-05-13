namespace DesafioMt.Domain.Common;

public class DomainException : Exception
{
    public DomainException(string message) : base(message) { }
    public DomainException(string message, Exception inner) : base(message, inner) { }
}

public class DomainConflictException : DomainException
{
    public DomainConflictException(string message) : base(message) { }
}

public class DomainNotFoundException : DomainException
{
    public DomainNotFoundException(string message) : base(message) { }
}
